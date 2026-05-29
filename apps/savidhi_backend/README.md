# savidhi_backend

Seven Express microservices + Postgres + Redis + MinIO, orchestrated by `docker-compose` locally and GKE in prod.

| Service | Port | Owns |
|---------|------|------|
| `gateway-service` | 4000 | Routing, rate limit, CORS, JWT verify |
| `auth-service` | 4001 | JWT access+refresh, OTP via Twilio Verify, role gates |
| `user-service` | 4002 | Devotee profile, addresses, family invites, in-app notifications |
| `catalog-service` | 4003 | Temples, pujas, chadhavas, deities, panchang, translations (en↔hi) |
| `booking-service` | 4004 | Bookings, Razorpay, Shiprocket, subscriptions, materializer, workers |
| `media-service` | 4005 | Image/video upload — MinIO (local) or GCS (prod) |
| `notification-service` | 4006 | FCM push, Twilio SMS/WhatsApp, SMTP email, broadcast |

Each service is an independent Node 20 + TypeScript + Express app with a `Dockerfile` (multi-stage: dev/prod targets). Shared utilities (auth middleware, DB pool, logger) live in [`lib/`](lib/) and are mounted read-only into every container at `/app/lib`.

---

## Layout

```
apps/savidhi_backend/
├── docker-compose.yml          ← Local orchestration (postgres, redis, minio, 7 services)
├── services/
│   ├── gateway-service/        ← src/, Dockerfile, package.json
│   ├── auth-service/
│   ├── user-service/
│   ├── catalog-service/
│   ├── booking-service/        ← Has src/workers/ (subscription rollover, expire payments, autocomplete)
│   ├── media-service/
│   └── notification-service/
├── lib/                        ← Shared middleware/db/logger (mounted into containers)
├── migrations/                 ← 001–027 SQL, auto-applied to a clean Postgres volume
├── docs/                       ← Critical-flow docs (see below)
├── k8s/                        ← Prod manifests (GKE)
├── scripts/
│   ├── setup.sh                ← First-time: create .env, install deps
│   ├── start-dev.sh            ← docker-compose up -d
│   ├── stop-dev.sh             ← docker-compose down
│   ├── reset-db.sh             ← Wipe volume + replay migrations (use after pulling a new 0NN_*.sql)
│   └── gcp-bootstrap.sh        ← One-time GCP project + Cloud SQL setup
└── .env.example
```

---

## Local lifecycle

From this directory (or via `npm run backend:*` at the repo root):

```bash
# first time only
cp .env.example .env
docker-compose up -d --build

# everyday
docker-compose up -d            # boot
docker-compose logs -f auth-service     # tail one service
docker-compose ps                # status
docker-compose down              # stop, KEEP data volume
docker-compose down -v           # stop, WIPE data volume (next boot re-applies all migrations)

# convenience: same effect as `down -v && up -d`
bash scripts/reset-db.sh
```

Health checks (every service exposes `/health`):

```bash
for p in 4000 4001 4002 4003 4004 4005 4006; do curl -s http://localhost:$p/health; echo; done
```

---

## Migrations

Migrations 001–027 are plain SQL files in [`migrations/`](migrations/). On a **clean** Postgres volume, Docker auto-runs them in alphabetical order via the `/docker-entrypoint-initdb.d` mount. Once the volume exists, Postgres ignores the folder — that's why `reset-db.sh` exists.

- `001_init.sql` — Core schema.
- `002_seed.sql` — Deprecated seed (kept for history).
- `003_seed_gen1.sql` — Active seed: temples, pujas, chadhavas, events, devotees, default admin.
- `004–022` — Incremental schema (family, raw media, slugs, chadhava-no-ship, translations, idempotency, shlok, banners…). Each filename describes the change.
- `023_subscription_bookings.sql` — Subscription bookings phase A.
- `024_shiprocket_shipments.sql` — Shipment tracking columns + tables.
- `025_defer_booking_creation.sql` — Booking row materialized only after payment verified.
- `026_translations_extended.sql`, `027_translations_en_siblings.sql` — Bidirectional `_en`/`_hi` sibling columns on every catalog table.

**Note: there is no `007_*.sql`.** Sequence jumps 006 → 008. Originally an abandoned change; intentional gap.

### Adding migration 028

1. Create `migrations/028_short_description.sql`.
2. Start with a 1–5 line comment block describing the change + why.
3. Keep it idempotent where reasonable (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`). Append-only — no down/undo files.
4. Run `bash scripts/reset-db.sh` locally to verify clean replay end-to-end.
5. Apply to prod via the procedure in the `savidhi_prod_migrations` memory file (`kubectl run postgres:15-alpine` inside the cluster — the Cloud SQL instance is private-IP only).

There is **no migration tracking table**. Source of truth = filenames in `migrations/`. Production ordering is enforced by the operator running them sequentially in `gcp-bootstrap.sh` step 2.

---

## Environment

See [`.env.example`](.env.example) for every key any service reads, grouped by category and tagged `[LOCAL]` / `[STUBBED]` / `[REQUIRED]`.

The headline rule: **the only required keys for a local boot are `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`** (any 32+ char strings). Everything else has a safe default or is stubbed off behind a feature flag.

---

## Workers + cronjobs

Three time-based jobs live in `services/booking-service/src/workers/`. In production they run as k8s CronJobs (`k8s/30-cronjob-appointment-autocomplete.yaml`, `k8s/31-cronjob-subscription-rollover.yaml`). Locally they can run inside the booking-service container by setting the corresponding env flag.

| Worker | What | Toggle |
|--------|------|--------|
| `expirePendingPayments.ts` | Marks bookings whose payment never arrived as expired | `RUN_EXPIRE_PAYMENTS_WORKER=true` |
| `appointmentAutoComplete.ts` | Auto-completes finished astrologer appointments | `RUN_AUTOCOMPLETE_WORKER=true` |
| `subscriptionRollover.ts` | Generates the next month's booking from a subscription | runs on the k8s schedule in prod; see [`docs/subscriptions.md`](docs/subscriptions.md) for manual invocation |

---

## Critical-flow docs (under `docs/`)

Short reference docs that lead with intent and link straight to the code. Read these in addition to the in-code comments.

| Doc | What |
|-----|------|
| [booking-flow.md](docs/booking-flow.md) | Deferred booking creation + materializer (migration 025) |
| [razorpay-integration.md](docs/razorpay-integration.md) | Order → checkout → verify → webhook |
| [shiprocket-integration.md](docs/shiprocket-integration.md) | Prasad shipping, AWB, webhook |
| [translations.md](docs/translations.md) | Google Translate v2, Hindi sibling columns, lazy on-write |
| [subscriptions.md](docs/subscriptions.md) | Subscription bookings + monthly rollover worker |
| [auth.md](docs/auth.md) | JWT, refresh, OTP stub, middleware |
| [admin-crud.md](docs/admin-crud.md) | Soft-delete, audit toast, apiClient rule |
| [chadhava-flow.md](docs/chadhava-flow.md) | Chadhavas vs pujas; why no shipping |
| [notifications.md](docs/notifications.md) | FCM push, in-app, broadcast |

For wider architecture + DB conventions, see `.claude/skills/savidhi-backend.md` and `savidhi-db.md`.

---

## Production

`k8s/` holds the GKE manifests; [`k8s/README.md`](k8s/README.md) has the kubectl apply order and image-bump workflow. The full cutover/deploy runbook lives in the `/savidhi-gcp-deploy` skill — start there before touching prod.

DB migrations against the private Cloud SQL instance: see the `savidhi_prod_migrations` memory file (`cloud-sql-proxy` from a laptop fails because the instance has no public IP; use `kubectl run postgres:15-alpine` from inside the cluster instead).
