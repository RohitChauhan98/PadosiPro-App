# PadosiPro Mobile

The PadosiPro onboarding app — **Your Lifestyle Manager**, in your pocket. Expo SDK 57 /
React Native 0.86 / React 19, TypeScript strict, every screen fully native (no WebViews).

**Running the app, the `10.0.2.2` emulator note, and the APK build steps are in the
[root README](../README.md).** Architecture and trade-offs: [`../DESIGN.md`](../DESIGN.md).

## Stack

expo-router v57 (typed routes, `(auth)` / `(app)` groups) · TanStack Query v5 (server state) ·
expo-secure-store (JWT session) · NativeWind v4 (Tailwind).

## Screens & flow

| Screen | Route | Notes |
| --- | --- | --- |
| Register | `/(auth)/register` | Inline validation, `EMAIL_TAKEN` handled inline |
| Verify Email | `/(auth)/verify-email` | 6-digit OTP boxes, 30 s resend countdown, distinct wrong-code (attempts remaining) / expired / max-attempts messages; auto-resends when routed from an `EMAIL_NOT_VERIFIED` login |
| Login | `/(auth)/login` | JWT to SecureStore; `INVALID_CREDENTIALS` / `EMAIL_NOT_VERIFIED` handled |
| Profile (first login) | `/(app)/profile?first=1` | Forced until `profileComplete`; +91 mobile normalised client-side to `^\+91[6-9]\d{9}$`; business name optional |
| Task Selection | `/(app)/tasks` | Grouped catalogue, search, multi-select, confirm sheet |
| Home | `/(app)/home` | Selected tasks grouped by category, edit tasks/profile, logout |

Route guards: `src/app/index.tsx` redirects on boot from the stored session; `(app)/_layout.tsx`
bounces signed-out users to login and forces the first-login profile until `profileComplete`;
any `401 UNAUTHORIZED` on an authenticated call drops the session globally. Every network screen
has loading, empty and error-with-retry states.

## API client

`src/lib/api.ts` — base URL from `EXPO_PUBLIC_API_URL` when set. Otherwise it uses the
dev-server host from the QR code on port 4000, then `http://10.0.2.2:4000/api` on Android
and `http://localhost:4000/api` elsewhere.
The contract error envelope (`error.code` / `message` / `details` / `attemptsRemaining` /
`retryAfterSeconds`) is parsed into a typed `ApiError`; unreachable hosts surface as a friendly
`NETWORK_ERROR`.

## Design

Copy and tone follow [padosipro.com](https://www.padosipro.com) — "Your Lifestyle Manager",
concierge warmth. Palette (`tailwind.config.js` / `src/theme.ts`): ivory `#FAF6EF` background,
pine green `#0E4030`–`#1B654C` primary, saffron `#E8A33D` accent, ink `#26221C` text, sand
`#E9E1D3` hairlines. White cards, 16 px radii, 52 px primary touch targets.

## Gates

`npm run typecheck` (tsc strict) and `npm run lint` (eslint-config-expo) — both clean.
The signed release APK is published in the project store at `media/padosipro-release.apk`.
