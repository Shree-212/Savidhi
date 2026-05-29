# Auth — JWT, refresh, OTP

## Why

Two clients (web + mobile) + admin all need the same auth identity. The platform uses JWT access tokens + a refresh-token cookie for web/admin, with OTP login via Twilio Verify (and a stub mode for local).

## Token lifecycle

- **Access token** — JWT signed with `JWT_ACCESS_SECRET`, expires in `JWT_ACCESS_EXPIRES` (default `1h`). Sent as `Authorization: Bearer <jwt>` on every API call.
- **Refresh token** — JWT signed with `JWT_REFRESH_SECRET`, expires in `JWT_REFRESH_EXPIRES` (default `7d`). Stored as an `httpOnly` `Secure` cookie on web/admin; stored in the iOS/Android keychain on mobile.
- **`/auth/refresh`** — accepts the refresh cookie/header, returns a fresh access token. The web axios interceptor (`apps/savidhi_web/src/lib/api.ts`) calls this once on 401 before bubbling the error.

## Login flows

1. **OTP login** (devotee) — `POST /auth/otp/send {phone}` triggers Twilio Verify (or, when `TWILIO_*` is blank, logs the OTP to stdout). `POST /auth/otp/verify {phone, code}` returns access + refresh tokens.
2. **Password login** (admin) — `POST /auth/admin/login {email, password}` against the `admin_users` table. Adds a `role: 'admin'` claim.
3. **Refresh** — `POST /auth/refresh` — see above.
4. **`/auth/me`** — returns the current user/admin. **Note:** harmless 401 on cold load — the web app calls this before the refresh-token cookie is in the request, then the interceptor calls `/auth/refresh` and retries. Don't chase this 401 in the console.

## Stubbed OTP locally

When `TWILIO_ACCOUNT_SID` is blank, `auth-service` skips the Twilio call and logs the generated OTP to stdout. `docker-compose logs -f auth-service` to see it.

## Middleware

Every service except `gateway-service` mounts [`lib/middleware/auth.ts`](../lib/middleware/auth.ts) on its protected routes. It verifies the access token with `JWT_ACCESS_SECRET`, populates `req.user`, and rejects on miss. The gateway *also* verifies — it's the same code path so the downstream services can trust the bearer token.

Role gates (`requireAdmin`, `requireRole('pujari')`) are also in this file.

## Files

- [`services/auth-service/src/routes/auth.ts`](../services/auth-service/src/routes/auth.ts) — OTP, admin login, refresh, /me.
- [`lib/middleware/auth.ts`](../lib/middleware/auth.ts) — shared verify middleware.
- [`apps/savidhi_web/src/lib/AuthContext.tsx`](../../savidhi_web/src/lib/AuthContext.tsx), [`auth.ts`](../../savidhi_web/src/lib/auth.ts) — web client side.

## Cookie domain

`AUTH_COOKIE_DOMAIN=.savidhi.in` in prod so the cookie is shared between savidhi.in (web) and admin.savidhi.in (admin). Blank locally — cookies stick to `localhost`, which is fine because both apps live on `localhost`.
