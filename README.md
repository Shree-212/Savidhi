# Savidhi — Monorepo

Savidhi is a temple-services platform: devotees discover and book pujas, chadhavas, and astrology consultations; pujaris perform them; admins run the catalog. The monorepo is a Turborepo with four apps (web, admin, mobile) talking to seven Express microservices behind one API gateway.

Live URLs (prod):

| App | URL |
|-----|-----|
| Devotee web | https://savidhi.in |
| Admin | https://admin.savidhi.in |
| API gateway | https://api.savidhi.in |

Mobile app distribution is via App Store / Play Store (release-managed separately).

---

## Monorepo layout

```
Savidhi/
├── package.json                ← npm workspaces + Turborepo
├── turbo.json
├── apps/
│   ├── savidhi_web/            ← Next.js 15 (port 3001)
│   ├── savidhi_admin/          ← Next.js 15 (port 3002)
│   ├── savidhi_mobile/         ← React Native 0.83 (Metro: 8081)
│   └── savidhi_backend/        ← Docker microservices
│       ├── services/           ← 7 Express services (4000–4006)
│       ├── migrations/         ← 001–027 SQL, auto-applied on first boot
│       ├── docs/               ← Critical-flow docs (see below)
│       ├── k8s/                ← Prod manifests (GKE)
│       └── docker-compose.yml
└── .claude/skills/             ← Deep-dive skill docs (cross-referenced below)
```

| Service | Port | Owns |
|---------|------|------|
| `gateway-service` | 4000 | Routing, rate-limit, CORS |
| `auth-service` | 4001 | JWT access+refresh, OTP (Twilio) |
| `user-service` | 4002 | Devotee profile, addresses, family |
| `catalog-service` | 4003 | Temples, pujas, chadhavas, deities, translations, panchang |
| `booking-service` | 4004 | Bookings, Razorpay, Shiprocket, subscriptions, materializer |
| `media-service` | 4005 | Image/video upload to MinIO (local) or GCS (prod) |
| `notification-service` | 4006 | FCM push, Twilio SMS/WhatsApp, SMTP email |

---

## Prerequisites

- **Node.js** 20+ (workspaces use npm 10)
- **Docker Desktop** ≥ 4.0 — recommend giving it ≥ 6 GB RAM
- **Xcode 15+** (mobile, iOS only) or **Android Studio + JDK 17** (mobile, Android only)
- **`gh`** CLI (optional, for PR work)

---

## Local quick start

From a fresh clone:

```bash
# 1. install JS deps for web + admin workspaces
npm install

# 2. seed env files (defaults are safe for local; see notes in each file)
cp apps/savidhi_backend/.env.example apps/savidhi_backend/.env
cp apps/savidhi_web/.env.local.example apps/savidhi_web/.env.local
cp apps/savidhi_admin/.env.local.example apps/savidhi_admin/.env.local

# 3. boot the backend (postgres + redis + minio + 7 services)
cd apps/savidhi_backend && docker-compose up -d && cd ../..

# 4. boot the web + admin Next.js apps
npm run dev:web-only
```

Verify (each should return immediately):

```bash
curl -s http://localhost:3001               # web      → 200
curl -s http://localhost:3002               # admin    → 307 (redirects to /login)
curl -s http://localhost:4000/health        # gateway  → {"status":"ok",...}
curl -s http://localhost:4001/health        # auth
curl -s http://localhost:4003/health        # catalog
```

Mobile boot (separate terminal, after backend is up):

```bash
npm run mobile:metro                        # Metro bundler on 8081
npm run mobile:ios                          # or mobile:android
```

> Mobile uses a hardcoded `localhost:4000` (iOS) / `10.0.2.2:4000` (Android emulator) for dev — see [apps/savidhi_mobile/README.md](apps/savidhi_mobile/README.md) for LAN-IP override when running on a physical device.

### Resetting the local DB

Migrations 001–027 only auto-apply to a **clean** Postgres volume. After pulling new migrations, run:

```bash
bash apps/savidhi_backend/scripts/reset-db.sh
```

This destroys local data and replays everything from scratch.

---

## Architecture at a glance

```
  ┌───────────┐   ┌───────────┐   ┌───────────┐
  │  web :3001│   │admin :3002│   │mobile (RN)│
  └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
        └───── HTTPS/JSON ────────────────┘
                       │
              ┌────────▼────────┐
              │ gateway :4000   │   rate limit + CORS + JWT verify
              └────────┬────────┘
        ┌───────┬──────┼──────┬───────┬────────┐
        ▼       ▼      ▼      ▼       ▼        ▼
     auth    user  catalog booking  media  notification
     :4001  :4002  :4003   :4004    :4005     :4006
        │      │      │      │        │         │
        ├──────┴──────┴──────┴────────┘         │
        │           Postgres :5432              │
        │           Redis :6379                 │
        │           MinIO :9000  (S3 local)     │
        └──────────────────────────── FCM, Twilio, SMTP (when configured)
```

External integrations: **Razorpay** (payments), **Shiprocket** (prasad shipping), **Prokerala** (panchang), **Google Cloud Translation** (en↔hi).

---

## Critical flows

Each doc is short (≤100 lines) and points at the canonical code paths — the code stays the source of truth.

| Flow | Doc | Touches |
|------|-----|---------|
| Deferred booking creation + materializer | [docs/booking-flow.md](apps/savidhi_backend/docs/booking-flow.md) | booking-service, migration 025 |
| Razorpay order/verify/webhook + idempotency | [docs/razorpay-integration.md](apps/savidhi_backend/docs/razorpay-integration.md) | booking-service, web, mobile |
| Shiprocket prasad shipping + webhook | [docs/shiprocket-integration.md](apps/savidhi_backend/docs/shiprocket-integration.md) | booking-service, migration 024 |
| Background translation (en↔hi siblings) | [docs/translations.md](apps/savidhi_backend/docs/translations.md) | catalog-service, migrations 013/026/027 |
| Subscription bookings + monthly rollover | [docs/subscriptions.md](apps/savidhi_backend/docs/subscriptions.md) | booking-service worker, migration 023 |
| Auth — JWT access/refresh + OTP stub | [docs/auth.md](apps/savidhi_backend/docs/auth.md) | auth-service, all-service middleware |
| Admin CRUD conventions | [docs/admin-crud.md](apps/savidhi_backend/docs/admin-crud.md) | savidhi_admin shared components |
| Chadhava flow (no prasad shipping) | [docs/chadhava-flow.md](apps/savidhi_backend/docs/chadhava-flow.md) | catalog + booking services |
| Notifications — FCM push + in-app | [docs/notifications.md](apps/savidhi_backend/docs/notifications.md) | notification-service, user-service |
| Meta Pixel + Conversions API tracking | [docs/meta-tracking.md](apps/savidhi_backend/docs/meta-tracking.md) | booking-service, web (Pixel + CAPI dedup) |

---

## Per-app docs

- [apps/savidhi_web/README.md](apps/savidhi_web/README.md) — devotee web (Next.js 15)
- [apps/savidhi_admin/README.md](apps/savidhi_admin/README.md) — admin panel (Next.js 15)
- [apps/savidhi_mobile/README.md](apps/savidhi_mobile/README.md) — devotee app (React Native 0.83)
- [apps/savidhi_backend/README.md](apps/savidhi_backend/README.md) — 7 microservices, migrations, workers

For deep dives on architecture and conventions, see the skill files under `.claude/skills/` (e.g. `savidhi-db.md`, `savidhi-backend.md`, `savidhi-admin-flow.md`). They're maintained alongside this code and stay authoritative when this README is being terse.

---

## Production

Production runs on GKE in `asia-south1` with Cloud SQL Postgres, Cloud NAT, and Cloud Storage. **Don't deploy from this README** — follow the runbook in the `/savidhi-gcp-deploy` skill (it has the pre-deploy gap list, the kubectl apply order, the secrets inventory, and the post-deploy verification). The k8s manifests themselves live in [apps/savidhi_backend/k8s/](apps/savidhi_backend/k8s/) with their own short [README](apps/savidhi_backend/k8s/README.md).

Memory files used by automated runs:

- `project_razorpay_creds.md` — Razorpay test keys
- `project_shiprocket_creds.md` — Shiprocket panel + webhook secret
- `project_gcp_account.md` — gcloud login, project, region
- `savidhi_prod_migrations.md` — how to apply DB migrations against the private Cloud SQL instance

---

## Useful scripts

| Script | What |
|--------|------|
| `npm install` | Install web + admin workspace deps |
| `npm run dev:web-only` | Run web + admin (skip mobile) |
| `npm run dev:ios` / `npm run dev:android` | Web + admin + mobile |
| `npm run mobile:metro` | Metro bundler only |
| `npm run mobile:ios` / `npm run mobile:android` | Build + boot native |
| `npm run backend:dev` | Boot backend via docker-compose |
| `npm run backend:stop` | Stop backend |
| `npm run backend:health` | Curl /health on every service |
| `bash apps/savidhi_backend/scripts/reset-db.sh` | Wipe local DB + replay all migrations |
| `docker-compose logs -f gateway-service` | Tail one service |

---

## Troubleshooting

**Port already in use.** `lsof -i :4000` to find it, `kill -9 <pid>`, or change the port in `apps/savidhi_backend/docker-compose.yml`.

**`docker-compose up` looks fine but new migration didn't apply.** Postgres only runs `/docker-entrypoint-initdb.d` on a clean volume. Run `bash apps/savidhi_backend/scripts/reset-db.sh`.

**`npm install` errors after `git pull`.** Delete `node_modules` at the root and in each workspace, then `npm install` again.

**Docker out of memory.** Give Docker Desktop ≥ 6 GB RAM (Settings → Resources). The seven services + Postgres + Redis + MinIO use ~3 GB warm.

**Mobile can't reach backend from physical device.** The `__DEV__` branch in `apps/savidhi_mobile/app/config/env.ts` points at `localhost`. On a real phone you need your laptop's LAN IP — see the mobile README.

**`/auth/me` returns 401 on cold load.** Expected — the web app calls it before the refresh-token cookie is established. It's harmless console noise.
