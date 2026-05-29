# Notifications — FCM push + in-app + broadcast

## Why

Three notification surfaces:

1. **Push** (mobile) — FCM. For booking status, payment receipt, reminder before a puja event, post-launch broadcasts.
2. **In-app** (web + mobile) — a `notifications` table the devotee sees as a feed.
3. **Transactional email + SMS/WhatsApp** — order receipts, OTP-adjacent confirmations.

`notification-service` is the writer/sender; `user-service` owns the in-app feed table.

## In-app feed (the boring durable one)

- Table: `notifications` (migration 004). Columns: `id`, `user_id`, `kind`, `title`, `body`, `payload JSONB`, `read_at`.
- Read API: `GET /notifications` ([`services/user-service/src/routes/notifications.ts`](../services/user-service/src/routes/notifications.ts)) — paginated, sorted by created_at.
- Mark-as-read: `PATCH /notifications/:id/read`.
- Mobile screen: `apps/savidhi_mobile/app/screens/notifications/`.

When the backend fires a notification, it ALWAYS inserts a `notifications` row first (durable), then attempts push/email/SMS (best-effort). If FCM is misconfigured the devotee still sees the in-app card on next open.

## Push (FCM)

- Sender: [`services/notification-service/src/routes/notifications.ts`](../services/notification-service/src/routes/notifications.ts) → Firebase Admin SDK.
- Auth: `FCM_SERVICE_ACCOUNT_JSON` env (single-line JSON of the Firebase service account key).
- Token registration: mobile posts its FCM device token to `user-service` `/users/me/push-token` on launch. The notification-service joins `users.fcm_token` when sending.
- Local: when `FCM_SERVICE_ACCOUNT_JSON` is blank, push sends no-op (logged) — exercise the in-app feed instead.

## Broadcast

The admin "Notifications" page (`apps/savidhi_admin/src/app/dashboard/notifications/`) POSTs `/notifications/broadcast` with `{ title, body, audience }`. The handler inserts one `notifications` row per targeted user (in batches) and fires FCM topic message in parallel.

## SMS / WhatsApp (Twilio)

- Senders defined by `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM`.
- Used for OTP-adjacent confirmations and high-priority booking events.
- No-op locally when `TWILIO_AUTH_TOKEN` is blank — auth-service logs the body instead.

## Email (SMTP)

- Nodemailer transport built from `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`.
- `SMTP_FROM` is the displayed sender.
- No-op locally when `SMTP_HOST` is blank.

## Files

- [`services/notification-service/src/routes/notifications.ts`](../services/notification-service/src/routes/notifications.ts) — send + broadcast.
- [`services/user-service/src/routes/notifications.ts`](../services/user-service/src/routes/notifications.ts) — in-app feed CRUD.
- [`migrations/004_family_notifications_blackouts.sql`](../migrations/004_family_notifications_blackouts.sql) — `notifications` table.
