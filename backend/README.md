# PadosiPro Backend API

Fastify 5 + Prisma (SQLite) backend: email + password registration with OTP verification,
JWT auth, profile management and a seeded task catalogue (127 tasks / 10 categories).

**Setup, environment variables, Docker Compose and the reviewer quick-start are in the
[root README](../README.md).** Architecture and trade-offs: [`../DESIGN.md`](../DESIGN.md).

Base URL: `http://localhost:4000/api`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with watch mode (migrates + seeds on boot) |
| `npm run build` / `npm start` | Compile to `dist/` / run compiled server |
| `npm test` | vitest suite (49 tests, throwaway `prisma/test.db`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:migrate` / `prisma:deploy` / `prisma:seed` | Dev migration / apply committed migrations / re-run idempotent seed |

Notable env: `RUN_MIGRATIONS=false` skips `prisma migrate deploy` on boot (used by tests).

## Layout

```
src/
  index.ts            entrypoint: migrate deploy -> seed -> listen
  app.ts              buildApp(deps): routes, JWT, error envelope (testable via app.inject)
  config.ts           zod-validated env
  lib/                errors (contract envelope), prisma, mailer, zod helper
  modules/auth/       register / verify-otp / resend-otp / login
  modules/otp/        OTP service (generation, hashing, TTL, attempts, cooldown)
  modules/profile/    profile upsert + Indian mobile normalization
  modules/tasks/      catalogue + per-user task selection
  seed/               catalogue data + idempotent seeder
prisma/               schema + migrations
tests/                vitest: OTP logic, auth rules, profile, tasks
```
