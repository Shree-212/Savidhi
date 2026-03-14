# Savidhi — Monorepo

A full-stack monorepo powered by **Turborepo** containing:

| App | Type | Port | Description |
|-----|------|------|-------------|
| `savidhi_web` | Next.js 15 | 3001 | Public-facing web frontend |
| `savidhi_admin` | Next.js 15 | 3002 | Admin / control panel |
| `savidhi_mobile` | React Native 0.83 | 8081 (Metro) | iOS & Android mobile app |
| `savidhi_backend` | Docker Microservices | 4000–4002 | API gateway + microservices |

---

## Quick Start

> Complete [Installation](#installation) and [Environment Variables](#environment-variables) first, then:

**1. Start the backend (Docker):**
```bash
cd apps/savidhi_backend
docker-compose up -d
```

**2. Start web apps (from repo root):**
```bash
npm run dev:web-only
```

**3. (Optional) Start mobile Metro:**
```bash
npm run mobile:metro
```

**Verify everything is running:**
```bash
curl http://localhost:3001            # savidhi_web    → HTTP 200
curl http://localhost:3002            # savidhi_admin  → HTTP 307
curl http://localhost:8081            # Metro bundler  → HTTP 200
curl http://localhost:4000/health     # gateway        → {"status":"ok",...}
curl http://localhost:4001/health     # auth           → {"status":"ok",...}
curl http://localhost:4002/health     # user           → {"status":"ok",...}
```

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Environment Variables](#environment-variables)
5. [Running the Apps](#running-the-apps)
   - [savidhi\_web](#savidhi_web)
   - [savidhi\_admin](#savidhi_admin)
   - [savidhi\_mobile](#savidhi_mobile)
   - [savidhi\_backend](#savidhi_backend)
6. [Running Everything Together](#running-everything-together)
7. [Backend Architecture](#backend-architecture)
8. [Building for Production](#building-for-production)
9. [Useful Scripts Reference](#useful-scripts-reference)
10. [Troubleshooting](#troubleshooting)

---

## Project Structure

```
Savidhi/
├── package.json          ← Root workspace (npm workspaces + Turborepo)
├── turbo.json            ← Turborepo pipeline config
├── tsconfig.json         ← Base TypeScript config
└── apps/
    ├── savidhi_web/      ← Next.js public web (port 3001)
    │   └── src/
    │       ├── app/          ← App Router pages & layouts
    │       ├── components/   ← UI & shared components
    │       ├── lib/          ← store, utils, types, config, constants
    │       ├── hooks/        ← custom React hooks
    │       └── styles/
    ├── savidhi_admin/    ← Next.js admin panel (port 3002)
    │   └── src/
    │       ├── app/          ← login, dashboard pages
    │       ├── components/   ← ui, layout, auth, dashboard
    │       ├── contexts/     ← AuthContext
    │       ├── lib/          ← api.ts, utils.ts, env.ts
    │       └── types/
    ├── savidhi_mobile/   ← React Native standalone app
    │   └── app/
    │       ├── screens/      ← Screen components
    │       ├── navigation/   ← AppNavigator
    │       ├── config/       ← env.ts, api-endpoints.ts
    │       ├── utils/
    │       └── types/
    └── savidhi_backend/  ← Microservices orchestrator
        ├── docker-compose.yml
        ├── scripts/          ← setup.sh, start-dev.sh, stop-dev.sh
        ├── migrations/       ← SQL migration files
        ├── lib/              ← Shared backend utilities
        └── services/
            ├── auth-service/     ← JWT auth (port 4001)
            ├── gateway-service/  ← API gateway (port 4000)
            └── user-service/     ← User management (port 4002)
```

---

## Prerequisites

### All platforms

| Tool | Minimum version | Install |
|------|----------------|---------|
| Node.js | 18.x | https://nodejs.org |
| npm | 8.x | Bundled with Node.js |
| Git | Any recent | https://git-scm.com |

### Backend (Docker)

| Tool | Notes |
|------|-------|
| Docker Desktop | https://www.docker.com/products/docker-desktop |
| Docker Compose | Bundled with Docker Desktop |

### iOS development (macOS only)

| Tool | Notes |
|------|-------|
| Xcode 15+ | Install from App Store |
| CocoaPods | `sudo gem install cocoapods` |
| Xcode CLI tools | `xcode-select --install` |

### Android development

| Tool | Notes |
|------|-------|
| Android Studio | https://developer.android.com/studio |
| Java 17 (JDK) | Bundled with Android Studio |
| Android SDK (API 34+) | Install via Android Studio SDK Manager |

> **Tip — React Native environment check:** After installing Xcode / Android Studio, run:
> ```bash
> npx react-native doctor
> ```
> This shows a full checklist and highlights anything missing.

---

## Installation

### 1 — Clone / enter the repo

```bash
cd /path/to/your/GitHub
# project is already at ./Savidhi
cd Savidhi
```

### 2 — Install root + web/admin workspace dependencies

Run once from the **repo root**. This installs `savidhi_web` and `savidhi_admin`
via npm workspaces, plus Turborepo and other root devDependencies.

```bash
npm install
```

### 3 — Install mobile dependencies (standalone)

`savidhi_mobile` is intentionally outside the workspace (React Native requires
its own isolated `node_modules`).

```bash
cd apps/savidhi_mobile
npm install
cd ../..
```

### 4 — Install backend service dependencies

Each microservice has its own `package.json`.

```bash
cd apps/savidhi_backend/services/auth-service    && npm install && cd ../../..
cd apps/savidhi_backend/services/gateway-service && npm install && cd ../../..
cd apps/savidhi_backend/services/user-service    && npm install && cd ../../..
```

Or run them all at once:

```bash
for svc in auth-service gateway-service user-service; do
  (cd apps/savidhi_backend/services/$svc && npm install)
done
```

### 5 — iOS native setup (first time only)

```bash
cd apps/savidhi_mobile/ios
pod install
cd ../../..
```

> **Note:** The `ios/` and `android/` native directories are generated the first
> time you run `npx react-native run-ios` or `npx react-native run-android`.
> If they don't exist yet, run:
> ```bash
> cd apps/savidhi_mobile
> npx @react-native-community/cli init savidhi_mobile --skip-install
> # then move the custom app/ files back in, and re-run pod install
> ```

---

## Environment Variables

### `apps/savidhi_web`

Copy the example and edit:

```bash
cp apps/savidhi_web/.env.local.example apps/savidhi_web/.env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API gateway base URL |

### `apps/savidhi_admin`

```bash
cp apps/savidhi_admin/.env.local.example apps/savidhi_admin/.env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API gateway base URL |
| `INTERNAL_GATEWAY_URL` | _(optional)_ | Docker-internal gateway URL |

### `apps/savidhi_backend`

```bash
cp apps/savidhi_backend/.env.example apps/savidhi_backend/.env
# Edit the file and set strong values for JWT secrets
```

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `POSTGRES_DB` | PostgreSQL database name |
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (min 32 chars) |
| `CORS_ORIGIN` | Comma-separated list of allowed origins |

> **Security:** Never commit `.env` or `.env.local` files to version control.
> They are already in `.gitignore`.

---

## Running the Apps

### savidhi\_web

**Development** (hot-reload on port 3001):

```bash
npm run dev:web
# or, from the app directory:
cd apps/savidhi_web && npm run dev
```

**Open:** http://localhost:3001

---

### savidhi\_admin

**Development** (hot-reload on port 3002):

```bash
npm run dev:admin
# or, from the app directory:
cd apps/savidhi_admin && npm run dev
```

**Open:** http://localhost:3002  
Default redirect → http://localhost:3002/login → dashboard

---

### savidhi\_mobile

#### Start Metro bundler

```bash
npm run mobile:metro
# or:
cd apps/savidhi_mobile && npm start
```

#### Run on iOS (separate terminal)

```bash
npm run mobile:ios
# or:
cd apps/savidhi_mobile && npm run ios
```

#### Run on Android (separate terminal)

Make sure an Android emulator is running (open Android Studio → Device Manager → Play),
then:

```bash
npm run mobile:android
# or:
cd apps/savidhi_mobile && npm run android
```

#### Useful mobile commands

```bash
# Reset Metro cache
cd apps/savidhi_mobile && npm run reset-cache

# Clean build artefacts
cd apps/savidhi_mobile && npm run clean

# Run React Native environment doctor
cd apps/savidhi_mobile && npx react-native doctor
```

---

### savidhi\_backend

The backend runs entirely inside **Docker**. Make sure Docker Desktop is running.

#### First-time setup

```bash
npm run backend:setup
# copies .env.example → .env if not present, installs service deps
```

#### Start all services (detached)

```bash
npm run backend:dev
# or directly:
cd apps/savidhi_backend && docker-compose up -d
```

This spins up:

| Container | Port | Description |
|-----------|------|-------------|
| `postgres` | 5432 | PostgreSQL 15 database |
| `redis` | 6379 | Redis 7 cache |
| `gateway-service` | 4000 | API gateway (entry point for all clients) |
| `auth-service` | 4001 | JWT authentication |
| `user-service` | 4002 | User management |

#### Stop services

```bash
npm run backend:stop          # stop but keep containers
npm run backend:stop -- --clean    # remove containers
npm run backend:stop -- --clean --volumes  # also wipe DB volumes
```

#### Check service health

```bash
npm run backend:health
# or check individually:
curl http://localhost:4000/health   # gateway
curl http://localhost:4001/health   # auth
curl http://localhost:4002/health   # user
```

#### View logs

```bash
cd apps/savidhi_backend && docker-compose logs -f
# Single service:
docker-compose logs -f auth-service
```

#### Running a service locally (without Docker)

```bash
npm run backend:auth    # starts auth-service with tsx watch
npm run backend:gateway # starts gateway-service
npm run backend:user    # starts user-service
```

> **Note:** When running services locally (non-Docker), make sure PostgreSQL and
> Redis are accessible on `localhost:5432` and `localhost:6379` respectively,
> and create a `.env` in each service directory with the same variables.

---

## Running Everything Together

To run the two Next.js apps + mobile Metro bundler simultaneously:

```bash
npm run dev
```

To run only the web apps (no mobile Metro):

```bash
npm run dev:web-only
```

To run with mobile + iOS simulator:

```bash
npm run dev:ios
```

To run with mobile + Android emulator:

```bash
npm run dev:android
```

> **Backend is separate.** The backend must be started independently with
> `npm run backend:dev`. The web/admin apps proxy all `/api/*` requests to
> the gateway at `http://localhost:4000`.

---

## Backend Architecture

```
Client (web / admin / mobile)
         │
         │  HTTP /api/v1/*
         ▼
  ┌─────────────────┐  port 4000
  │  gateway-service│  ← rate limiting, CORS, routing
  └────────┬────────┘
           │
     ┌─────┴──────┐
     │            │
     ▼            ▼
 auth-service   user-service
  port 4001      port 4002
     │
     └─── postgres:5432
          redis:6379
```

### Adding a new microservice

1. Create `apps/savidhi_backend/services/my-service/` with `package.json`, `tsconfig.json`, `Dockerfile`, and `src/index.ts`.
2. Add the service to `docker-compose.yml` (copy an existing service block, update port/env).
3. Add a proxy route in `gateway-service/src/index.ts`.
4. Add an `npm run my-service:dev` script to `savidhi_backend/package.json`.

---

## Building for Production

### Next.js apps

```bash
npm run build          # builds all workspace apps via Turborepo
# or individually:
cd apps/savidhi_web   && npm run build
cd apps/savidhi_admin && npm run build
```

### Backend services (Docker)

```bash
cd apps/savidhi_backend && docker-compose build
```

For production deployment with a production compose file:

```bash
cd apps/savidhi_backend && docker-compose -f docker-compose.prod.yml up -d
```

### Mobile

```bash
# Android release APK
cd apps/savidhi_mobile/android
./gradlew bundleRelease

# iOS archive — use Xcode → Product → Archive
```

---

## Useful Scripts Reference

All scripts are run from the **repo root** unless noted.

| Script | Description |
|--------|-------------|
| `npm run dev` | Web apps + mobile Metro (all together) |
| `npm run dev:web-only` | savidhi_web + savidhi_admin only |
| `npm run dev:web` | savidhi_web only |
| `npm run dev:admin` | savidhi_admin only |
| `npm run dev:ios` | Web + Metro + iOS simulator |
| `npm run dev:android` | Web + Metro + Android emulator |
| `npm run mobile:metro` | Start Metro bundler only |
| `npm run mobile:ios` | Run app on iOS |
| `npm run mobile:android` | Run app on Android |
| `npm run backend:setup` | First-time backend setup |
| `npm run backend:dev` | Start all backend Docker services |
| `npm run backend:stop` | Stop backend Docker services |
| `npm run backend:health` | Health check all services |
| `npm run build` | Production build (all apps via Turbo) |
| `npm run lint` | Lint all apps via Turbo |
| `npm run test` | Test all apps via Turbo |

---

## Troubleshooting

### `next: command not found` in web/admin

Run `npm install` from the repo root. `next` is hoisted to the root
`node_modules` by npm workspaces.

### Metro bundler port conflict

If port 8081 is in use:

```bash
cd apps/savidhi_mobile && npm start -- --port 8082
```

### `Unable to connect to Metro` on device/simulator

Make sure Metro is running (`npm run mobile:metro`) and the device is on the
same network. For Android emulator, check `adb reverse tcp:8081 tcp:8081`.

### Backend services not starting

1. Make sure Docker Desktop is running.
2. Check `.env` exists: `ls apps/savidhi_backend/.env`
3. View logs: `cd apps/savidhi_backend && docker-compose logs`

### Backend containers crash immediately (`Cannot find module` or `tsx: not found`)

The anonymous `node_modules` volume may be stale from an older image. Wipe all
volumes and restart:

```bash
cd apps/savidhi_backend
docker-compose down -v   # removes containers AND volumes
docker-compose up -d     # fresh start — volumes seeded from new image
```

> The `-v` flag is safe for development; it only removes the postgres data
> volume (which has no production data locally).

### PostgreSQL port 5432 already in use

Another local Postgres instance is running. Stop it or change the host port in
`docker-compose.yml`:

```yaml
ports:
  - "5433:5432"   # map to 5433 on host instead
```

Then update `DB_PORT=5433` in your services' env.

### iOS build fails — `pod install` errors

```bash
cd apps/savidhi_mobile/ios
pod deintegrate && pod install
```

If CocoaPods itself is not found: `sudo gem install cocoapods`

### Android build fails — SDK not found

In Android Studio → SDK Manager, make sure **Android SDK Platform 34** and
**Android SDK Build-Tools 34** are installed. Set `ANDROID_HOME` in your
shell profile:

```bash
# Add to ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Then reload: `source ~/.zshrc`

---

> Built with Turborepo · Next.js · React Native · Express · PostgreSQL · Redis · Docker
