# savidhi_web

Public-facing devotee web (Next.js 15, App Router, TypeScript). Discovery + booking surface for pujas, chadhavas, panchang, points, and (when re-enabled) astrology consults.

Live: https://savidhi.in. Dev: http://localhost:3001.

---

## Stack

- Next.js 15 (App Router, Server Components)
- React 19
- Tailwind + custom CSS modules under `src/styles/`
- Razorpay Checkout.js v1 (loaded on demand from `src/lib/razorpay.ts`)
- i18n via `src/lib/i18n.tsx` (en + hi)

---

## Directory layout

```
src/
├── app/                  ← App Router routes (one folder = one URL segment)
│   ├── puja/             ← /puja, /puja/[id], booking sheet
│   ├── chadhava/         ← /chadhava, /chadhava/[id]
│   ├── consult/          ← /consult, /consult/[id], /consult/[id]/book (gated for May-2026)
│   ├── bookings/         ← /bookings, /bookings/chadhava, /bookings/appointments
│   ├── temples/, panchang/, points/, profile/, login/, …
│   └── layout.tsx        ← Root layout: AuthContext, analytics, i18n provider
├── components/
│   ├── shared/           ← Cross-page cards, sheets, modals
│   └── ui/               ← Primitives (Button, Input, …)
├── lib/
│   ├── api.ts            ← Thin axios wrapper, attaches access token
│   ├── auth.ts, AuthContext.tsx  ← Refresh-token flow
│   ├── razorpay.ts       ← Lazy-load Checkout.js + openCheckout()
│   ├── analytics.ts      ← Meta Pixel + GA4 (no-op when IDs unset)
│   ├── i18n.tsx          ← Locale switcher (en/hi)
│   └── store/, services/, mappers.ts, utils/
├── messages/             ← Translation JSON files
├── middleware.ts         ← Forwards x-pathname header for SEO canonicals
└── styles/
```

---

## How it talks to the backend

All API calls go through `src/lib/api.ts` to `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). The Next.js config also rewrites `/api/*` to the gateway, so server-side fetches can hit relative paths.

Auth flow: access token in memory (Context), refresh token in an `httpOnly` cookie set by `auth-service`. On 401, the axios interceptor calls `/auth/refresh` once before bubbling the error. The first `/auth/me` after a cold load typically 401s before the refresh resolves — that 401 in the browser console is harmless.

---

## Key flows (jump points)

| Flow | Entry route | Code |
|------|-------------|------|
| Puja browse + book | `/puja` → `/puja/[id]` → sheet | `app/puja/`, `components/shared/PujaBookingSheet.tsx` |
| Chadhava browse + book | `/chadhava/[id]` | `app/chadhava/`, `components/shared/ChadhavaBookingSheet.tsx` |
| Subscription bookings | within puja sheet (toggle) | see [`apps/savidhi_backend/docs/subscriptions.md`](../savidhi_backend/docs/subscriptions.md) |
| Razorpay payment | sheet → checkout | `src/lib/razorpay.ts`, [`docs/razorpay-integration.md`](../savidhi_backend/docs/razorpay-integration.md) |
| My bookings | `/bookings`, `/bookings/chadhava`, `/bookings/appointments` | `app/bookings/` |
| Panchang | `/panchang` | `app/panchang/` (catalog-service `/panchang`) |
| Login (OTP) | `/login` | `app/login/`, `services/auth.ts` |

---

## Environment

Copy `.env.local.example` → `.env.local`. All keys are `NEXT_PUBLIC_*` so they're inlined at build time.

| Key | Required? | Notes |
|-----|-----------|-------|
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:4000` for dev |
| `NEXT_PUBLIC_SITE_URL` | for SEO | canonical/og:url; set to prod URL when deploying |
| `NEXT_PUBLIC_ADMIN_URL` | optional | a few "open in admin" links |
| `NEXT_PUBLIC_META_PIXEL_ID` | optional | pixel only injected when set |
| `NEXT_PUBLIC_GA4_ID` | optional | gtag only injected when set |

---

## May-2026 launch — disabled features

The astrologer UI was scope-cut for launch. The devotee web hides the Consult section from navigation and the `/consult` routes redirect to home. The backend (`booking-service` appointments, `astrologer_*` tables) is still intact — see the `project_astrologer_ui_disabled` memory file for the restore checklist.

Re-enabling means undoing two things: removing the hide from the nav component and dropping the `/consult` redirect. Code reference for the disable points: search for `// LAUNCH-DISABLED` or grep `consult` in `src/components/layout/` and `src/middleware.ts`.

---

## Run

```bash
# from repo root
npm install
cp apps/savidhi_web/.env.local.example apps/savidhi_web/.env.local
# backend must be up: cd apps/savidhi_backend && docker-compose up -d
npm run dev:web              # or: npm run dev:web-only (web + admin)
```

Open http://localhost:3001.

---

## Deeper dive

`.claude/skills/savidhi-web.md` and `savidhi-web-flow.md` document the full screen flow (with Figma node references) and component conventions.
