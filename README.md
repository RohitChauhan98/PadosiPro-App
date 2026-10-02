# PadosiPro Onboarding — Take-Home Assignment

Full-stack onboarding flow for **PadosiPro** ("Your Lifestyle Manager"): email + password
registration with OTP verification, JWT login, a mandatory first-login profile, and selection
from a seeded catalogue of household tasks.

- `backend/` — Fastify 5 + Prisma (SQLite) API. See `backend/README.md`.
- `mobile/` — Expo (SDK 57) / React Native app. See `mobile/README.md`.
- `DESIGN.md` — architecture, trade-offs, and what was left out.

## Prerequisites

| Tool | Version | Needed for |
| --- | --- | --- |
| Node.js | ≥ 22 | backend, mobile tooling |
| npm | ≥ 10 | backend, mobile tooling |
| Docker + Docker Compose | any recent | the one-command backend path (optional) |
| Mailpit binary | v1.31+ | the no-Docker backend path (email sink) |
| JDK | 21 | building the Android APK |
| Android SDK | cmdline-tools, platform-tools, `platforms;android-36`, `build-tools;36.0.0`, NDK `27.1.12297006`, cmake `3.22.1` | building the Android APK |
| Expo Go or an Android emulator/device | — | running the app without an APK build |

## Quick start: backend

### Option A — one command, Docker Compose (API + Mailpit)

From the repo root:

```bash
docker compose up --build
```

- API: http://localhost:4000 (`/api/health` → `{"status":"ok"}`; boot runs `prisma migrate deploy` + the idempotent seed)
- Mailpit web UI: http://localhost:8025 (SMTP on 1025) — **all verification emails land here**

### Option B — no Docker (local dev)

Email is sent over SMTP; **Mailpit is the email path** for local development (a real SMTP
provider is not needed or configured). Grab a standalone binary from
<https://github.com/axllent/mailpit/releases> and run it:

```bash
./mailpit            # SMTP on 1025, web UI + HTTP API on 8025
```

Then the API:

```bash
cd backend
npm install
cp .env.example .env     # defaults are already correct for local dev + Mailpit
npx prisma migrate dev   # create dev.db and apply migrations
npm run dev              # http://localhost:4000 — migrates + seeds on boot
```

### Environment variables

`backend/.env.example` documents every variable; copying it is enough for local dev:

```
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="24h"          # 300s / 15m / 24h / 7d
OTP_PEPPER="change-me-too"    # OTPs are stored only as SHA-256(pepper + userId + code)
SMTP_HOST=localhost           # Mailpit
SMTP_PORT=1025
SMTP_USER=                    # empty for Mailpit
SMTP_PASS=
SMTP_FROM="PadosiPro <no-reply@padosipro.local>"
```

In Docker Compose these are set for you (`SMTP_HOST=mailpit`).

### Verify it works

```bash
curl http://localhost:4000/api/health
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"password1"}'
# open http://localhost:8025 — the 6-digit code is in the email
```

Run the test suite (49 tests, throwaway SQLite db — no services needed):

```bash
cd backend && npm test
```

## Quick start: mobile app

```bash
cd mobile
npm install
npm start          # Expo dev server
```

Then either:

- **Expo Go** (fastest): scan the QR code with the Expo Go app. The app calls the API on
  the same computer address Expo used for that QR code, port 4000, so a changing IP does
  not need to be pasted. Set `EXPO_PUBLIC_API_URL` only to override that.
- **Android emulator**: `npm run android`. With no dev-server address, the app uses
  `http://10.0.2.2:4000/api`, which maps to the host's `localhost:4000`.
  (On any other platform that fallback is `http://localhost:4000/api`.)

Flow to try: register → grab the OTP from Mailpit (http://localhost:8025) → verify → login →
first-login profile (name, +91 mobile, address, optional business name) → pick tasks → home.
Restart the app to confirm the session persists (JWT in SecureStore).

Gates: `npm run typecheck` and `npm run lint` (both clean).

## Building the signed APK

The native `android/` folder is generated (Expo CNG) and git-ignored, as is the keystore.

```bash
cd mobile
npm install
npx expo prebuild -p android

# one-time: generate a release keystore (never commit it)
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/padosipro-release.keystore \
  -alias padosipro -keyalg RSA -keysize 2048 -validity 10000

# wire signing into android/app/build.gradle (release signingConfig reading
# PADOSIPRO_UPLOAD_* from android/gradle.properties), then:
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

Requires JDK 21 and the Android SDK packages listed under Prerequisites
(`ANDROID_HOME` set). A pre-built signed release APK (`padosipro-release.apk`, ~59 MB,
SHA-256 `d667a884…4cdb`) is included with this submission; rebuild from source with the
steps above if you prefer.

## Repo layout

```
backend/     Fastify 5 + Prisma/SQLite API (OTP auth, profile, task catalogue) + tests
mobile/      Expo SDK 57 app (expo-router, TanStack Query, SecureStore, NativeWind)
docker-compose.yml   api + mailpit, one-command backend
DESIGN.md    architecture and trade-offs
```
