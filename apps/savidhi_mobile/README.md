# savidhi_mobile

Devotee mobile app (React Native 0.83, TypeScript, bare workflow). iOS + Android. Distributed via App Store and Play Store.

---

## Stack

- React Native 0.83 (bare workflow — no Expo)
- TypeScript
- React Navigation (stack + tab; see `app/navigation/appNavigator.tsx`)
- Razorpay SDK (native) — wrapped in `app/services/payment.ts`
- FCM via `@react-native-firebase/messaging`
- Metro bundler on port 8081

---

## Directory layout

```
app/
├── app.tsx                 ← Root component, providers
├── navigation/
│   ├── appNavigator.tsx    ← Tab + stack definitions; the place where the
│   │                          /consult tab is hidden for the May-2026 launch
│   └── types/
├── screens/
│   ├── auth/               ← OTP login
│   ├── home/               ← Feed (banners, panchang, popular pujas)
│   ├── puja/               ← Browse + detail + booking sheet
│   ├── chadhava/           ← Browse + detail + booking sheet
│   ├── bookings/           ← My bookings + tracking
│   ├── consult/            ← (gated — see below)
│   ├── family/             ← 3 tabs: members, invites, settings
│   ├── notifications/      ← In-app notification list
│   ├── panchang/, points/, profile/, temples/
├── services/
│   ├── api.ts              ← axios client → ENV.API_URL
│   ├── payment.ts          ← Razorpay native open + verify
│   └── extra.ts, index.ts
├── components/, theme/, utils/, data/, types/
└── config/
    └── env.ts              ← API_URL switch (dev vs prod) — see below
```

---

## Environment / API URL

There's no `.env` file — the API URL is a 6-line TypeScript module at `app/config/env.ts`:

```ts
import { Platform } from 'react-native';
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const ENV = {
  API_URL: __DEV__ ? `http://${DEV_HOST}:4000` : 'https://api.savidhi.in',
  APP_ENV: __DEV__ ? 'development' : 'production',
} as const;
```

- **iOS simulator** → `http://localhost:4000` (works out of the box, since simulator shares the host loopback).
- **Android emulator** → `http://10.0.2.2:4000` (the magic alias Android uses for the host loopback).
- **Physical device (iOS or Android)** → neither works. Change `DEV_HOST` to your laptop's LAN IP (e.g. `192.168.1.42`) and ensure the laptop's firewall allows inbound :4000. Don't commit that change.

Prod URL (`api.savidhi.in`) is hardcoded for the release build — `__DEV__` is the React Native global that's `true` only in dev builds.

---

## Running locally

Prereqs: Node 20+, Xcode 15+ (iOS) or Android Studio + JDK 17 (Android), CocoaPods (`gem install cocoapods`).

Backend must be up first: `cd apps/savidhi_backend && docker-compose up -d`.

```bash
# from repo root
npm install                       # installs RN + workspaces

# first-time iOS only — install Pods
cd apps/savidhi_mobile/ios && pod install && cd -

# boot Metro (terminal 1)
npm run mobile:metro

# boot native (terminal 2)
npm run mobile:ios                # or: npm run mobile:android
```

Combined (Metro + iOS in one process):

```bash
npm run dev:ios                   # or dev:android — also runs web + admin
```

---

## Key flows (jump points)

| Flow | Screen | Code |
|------|--------|------|
| OTP login | `screens/auth/` | `services/api.ts`, auth-service `/auth/otp/*` |
| Browse pujas | `screens/puja/` | catalog-service `/pujas` |
| Booking sheet + payment | bottom sheet in puja/chadhava detail | `services/payment.ts` + booking-service |
| Razorpay checkout | inside booking sheet | `services/payment.ts` → native Razorpay SDK |
| Bookings list + chadhava status | `screens/bookings/` | booking-service `/bookings`, `/bookings/chadhava` |
| Track package | `screens/bookings/.../Track…` | Shiprocket tracking URL (see migration 024) |
| Family invites | `screens/family/` (3 tabs) | user-service `/family/*` |
| Notifications | `screens/notifications/` | user-service `/notifications` (in-app), FCM (push) |
| Panchang | `screens/panchang/` | catalog-service `/panchang` |

---

## Push notifications (FCM)

`@react-native-firebase/messaging` registers a token on launch and POSTs it to `user-service` `/users/me/push-token`. Push payloads are sent by `notification-service` via the Firebase Admin SDK (`FCM_SERVICE_ACCOUNT_JSON` env on the server).

Locally, FCM doesn't deliver to the simulator — test push paths on a physical device with a real Firebase project, or test the in-app notification list instead (it's the same data, server-stored).

---

## May-2026 launch — disabled `/consult`

The astrologer consult flow is scope-cut for launch:

- The Consult tab is removed from `app/navigation/appNavigator.tsx` (search for `LAUNCH-DISABLED`).
- Backend (`appointments`, `astrologer_blackout_dates`) and screens under `screens/consult/` remain in the codebase intact.

Restore checklist: see `project_astrologer_ui_disabled` memory file. Re-adding the tab plus a corresponding deep-link route is enough — no schema or API changes needed.

---

## Deeper dive

`.claude/skills/savidhi-mobile.md` (architecture) and `savidhi-mobile-flow.md` (screen flow + Figma nodes) are the authoritative references.
