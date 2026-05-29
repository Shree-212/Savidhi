# savidhi_admin

Operations panel for the platform (Next.js 15, App Router, TypeScript). Used by ops to manage temples, pujas, chadhavas, deities, devotees, pujaris, bookings, hampers, payments, and notifications.

Live: https://admin.savidhi.in. Dev: http://localhost:3002.

---

## Stack

- Next.js 15 (App Router, mostly Client Components — admin is interaction-heavy)
- React 19
- Tailwind
- Shared CRUD primitives in `src/components/shared/`
- Auth via the same `auth-service` as the devotee web, but with an `admin_users` role gate

---

## Directory layout

```
src/
├── app/
│   ├── login/                  ← OTP/password login
│   └── dashboard/              ← All authenticated routes
│       ├── layout.tsx          ← Sidebar + role gate
│       ├── page.tsx            ← Dashboard home
│       ├── temples/            ← CRUD
│       ├── pujas/              ← CRUD + event scheduling + i18n editor
│       ├── chadhavas/          ← CRUD + event repeats
│       ├── deities/, astrologers/, devotees/, pujaris/
│       ├── puja-bookings/      ← Booking management + cancel/refund
│       ├── chadhava-bookings/  ← Same for chadhavas
│       ├── appointments/       ← Astrologer appointments
│       ├── hampers/            ← Prasad hampers (Shiprocket-linked)
│       ├── reports/            ← CSV / XLSX exports
│       ├── notifications/      ← Broadcast push notifications
│       ├── admin-users/        ← Manage other admin accounts
│       └── settings/           ← App-wide settings (banners, etc.)
├── components/
│   ├── shared/                 ← Generic CRUD primitives (see below)
│   └── …
├── lib/
│   ├── env.ts                  ← NEXT_PUBLIC_API_URL fallback
│   ├── api.ts                  ← exports `apiClient` (axios + auth interceptor)
│   └── …
└── styles/
```

---

## Shared CRUD primitives

Every admin page (pujas, temples, deities, …) uses the same set of components to stay consistent:

| Component | What it does |
|-----------|--------------|
| `DataTable.tsx` | Sortable, paginated, filterable rows. Soft-delete shown as `is_active=false`. |
| `ActionButtons.tsx` | View / Edit / Delete cluster. Delete = soft delete via `is_active=false`. |
| `Modal.tsx` | Create/Edit forms. Uncontrolled by default; controlled when a parent owns state. |
| `StatusBadge.tsx`, `StatusToggle.tsx` | Status pills + inline toggle (hits the same PUT endpoint as Edit). |
| `MediaUpload.tsx` | Drag-drop → `media-service` `/upload`. Returns the canonical media URL. |
| `PageHeader.tsx`, `SearchBar.tsx`, `TabToggle.tsx`, `TimelineView.tsx` | Layout helpers. |

CRUD conventions (see also `.claude/skills/savidhi-admin-flow.md`):

1. **Soft delete only.** No hard `DELETE`; setting `is_active=false` is the gesture.
2. **Audit toast.** Every successful mutation fires a toast that names the actor + entity. The toast is the cheap audit trail until a real audit log lands.
3. **Optimistic update where safe.** Status toggle is optimistic (revert on error). Full edits are pessimistic (wait for 200).
4. **Always go through `lib/api.ts`'s `apiClient`.** A 2026-04-27 incident traced "500 across all admin CRUD forms" to raw `fetch()` calls bypassing the axios interceptor and silently dropping the bearer token. The fix: every admin component imports `apiClient` from `lib/api.ts`. Don't re-introduce raw `fetch`.

---

## Critical admin panels

| Panel | What it surfaces |
|-------|------------------|
| Puja bookings | Booking detail, materializer status, mark-as-paid (stub mode), refund, cancel-all-bookings (sets pending_refund) |
| Chadhava bookings | Same as above, no shipping (terminal status = COMPLETED — see migration 008) |
| Hampers | Prasad packaging definitions, linked to Shiprocket — `Ship Prashad` button creates the AWB |
| Pujaris / Astrologers ledger | Settlement tracking (debit/credit + settle) |
| Off-day management | Astrologer blackout dates (migration 004) |
| Reports | Bookings, payments, refunds CSV/XLSX (booking-service `/reports`) |
| Notifications | Broadcast a push notification (notification-service `/broadcast`) |
| Settings → Home banners | JSONB on `app_settings` (migration 021) |

---

## How it talks to the backend

- Client-side: `src/lib/api.ts` (exports `apiClient`, axios + auth interceptor) → `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).
- Server-side / route handlers: `INTERNAL_GATEWAY_URL` if set (used when admin runs in the same Docker network as the gateway), else `NEXT_PUBLIC_API_URL`.
- Auth: same JWT + refresh cookie flow as web. The dashboard layout reads `/auth/me` and redirects to `/login` if the role isn't `admin`.

---

## Environment

| Key | Required? | Notes |
|-----|-----------|-------|
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:4000` for dev |
| `INTERNAL_GATEWAY_URL` | optional | server-side override when running inside Docker |

---

## Run

```bash
npm install
cp apps/savidhi_admin/.env.local.example apps/savidhi_admin/.env.local
# backend must be up
npm run dev:admin              # or: npm run dev:web-only (web + admin)
```

Open http://localhost:3002. Seed data (003_seed_gen1.sql) inserts a default admin login — see the seed file for credentials or create a new admin via `apps/savidhi_backend/scripts/`.

---

## Deeper dive

`.claude/skills/savidhi-admin.md` (tech stack + API integration) and `savidhi-admin-flow.md` (screen-by-screen UX + Figma nodes + every CRUD detail) — both authoritative.
