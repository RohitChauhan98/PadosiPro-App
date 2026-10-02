# PadosiPro Onboarding — Design Notes

## Architecture

```
┌────────────────────┐   HTTPS/JSON (contract v1)   ┌─────────────────────────────┐
│  Expo app (RN 0.86)│ ───────────────────────────▶ │  Fastify 5 API (Node 22)    │
│  expo-router,      │   Authorization: Bearer JWT  │  zod-validated, error       │
│  TanStack Query,   │ ◀─────────────────────────── │  envelope {error:{code,…}}  │
│  SecureStore (JWT) │                              │  ├─ modules/auth (register, │
└────────────────────┘                              │  │  verify-otp, resend, login)│
        phone: QR host :4000; else 10.0.2.2        │  ├─ modules/profile (upsert, │
                                                    │  │  +91 mobile normalisation) │
                                                    │  └─ modules/tasks (catalogue, │
                                                    │     per-user selection)      │
┌────────────────────┐   SMTP :1025                 │         │ Prisma 6          │
│  Mailpit (dev mail │ ◀─────────────────────────── │         ▼                   │
│  sink, UI :8025)   │   nodemailer — OTP emails    │  SQLite (file) — users,     │
└────────────────────┘                              │  otp_codes, profiles, tasks │
                                                    └─────────────────────────────┘
```

- **Auth**: register issues a 6-digit OTP (crypto-random, stored only as
  `SHA-256(pepper + userId + code)`, 10-min TTL, single-use, 5-attempt lockout, 30 s resend
  cooldown). Verifying marks the email verified; login then returns a stateless JWT
  (`{sub, email}`, 24 h). The app keeps it in the hardware-backed SecureStore; any 401 drops
  the session globally.
- **First-login profile**: login returns `profileComplete`; the app's route guard forces the
  profile screen until it is true, then the task picker, then home.
- **Contract-first**: a written API contract (`internal/api-contract.md`) was the single source
  of truth; backend and mobile were built against it in parallel and merged without changes on
  either side.

## Trade-offs

- **SQLite vs Postgres** — SQLite keeps the assignment zero-infrastructure (the whole stack is
  `docker compose up`, or just a binary + `npm run dev`) and Prisma makes the datasource a
  one-line change. Fine at onboarding-scale write rates; Postgres would be the first upgrade
  for concurrent writers / managed backups.
- **Stateless JWT vs sessions/refresh tokens** — a 24 h access token is simple and sufficient
  for a demo flow: no session store, no revocation list. The cost is no server-side logout and
  no silent renewal; a stolen token lives until expiry. Production would add short-lived access
  tokens + refresh-token rotation (see below).
- **Contract-first parallel build** — backend and mobile were built simultaneously by different
  workstreams against one written contract, then cross-verified. This doubles the value of the
  contract (it is also the test spec) at the cost of some upfront design discipline.
- **Business Name optional** — PadosiPro serves households first; not every household has a
  business. The field is nullable end-to-end (empty string → `null`) rather than required with a
  placeholder.
- **Email via SMTP + Mailpit in dev** — nodemailer against a local sink keeps the email path
  real (headers, bodies, delivery) without external credentials; production swaps in any SMTP
  provider via env vars.

## Left out (consciously)

- **Refresh tokens / token revocation** — single 24 h access token only.
- **Email-change flow** — changing email would need re-verification of the new address; profile
  edits deliberately exclude email.
- **Emulator E2E in CI** — the API journey is fully covered by vitest + curl, but there is no
  automated on-device UI test (Maestro/Detox) yet.
- **iOS build** — the app is iOS-ready Expo code, but only the Android APK is built and signed;
  iOS needs a macOS runner and an Apple Developer account.

## With another week

1. Refresh-token rotation + server-side revocation, and `GET /auth/me` to re-sync
   `profileComplete` without a fresh login.
2. Maestro E2E of the full journey on an emulator in CI, plus the backend suite in GitHub
   Actions with Docker Compose.
3. Email-change with re-verification; password reset via the same OTP machinery.
4. Postgres datasource + docker-compose profile, rate limiting on auth endpoints, structured
   logging/tracing.
5. iOS TestFlight build via EAS; deep links from the verification email into the app.
