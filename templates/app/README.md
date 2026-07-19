# Codeable Web Template

The golden template `codeable-web create` emits. It is a **real, runnable Next.js 16 app** — build
and iterate on it directly (`npm run dev`), and the CLI tokenizes it into `.eta` templates in M1.

## Quick start

```bash
npm install
cp .env.example .env.local     # point NEXT_PUBLIC_API_URL at your backend
npm run dev
```

Without a backend running the app still boots: `/` and `/dashboard` redirect to `/login` (proven by
`proxy.ts` reading the session cookie), and the login form renders and validates — sign-in itself
needs the backend.

## What's in here

| Layer | Where | Notes |
|---|---|---|
| Transport | `src/lib/http` | Envelope unwrap, bearer injection, single-flight refresh-on-401, abort forwarding, blob downloads |
| Auth (BFF) | `src/lib/auth` + `src/app/api/session` | httpOnly refresh cookie, in-memory access token, `proxy.ts` server-side gate |
| Roles | `src/constants/roles.ts` | `as const` tuples + exhaustive `Record`s → adding a role is a compile error until handled |
| i18n | `src/i18n` | Typed dot-path keys, zero hardcoded display strings |
| Tokens | `src/app/globals.css` | Brand ramp, status tones, typography classes; dark-ready, light-enabled |
| Data table | `src/components/shared/data-table` | TanStack Table + URL state; loading/empty/error built in |
| Components | `src/components/{shared,form,layout}` | The "core widgets" layer |
| Helpers | `src/lib/{datetime,format,mutations,reporting}` | The DateTimeHelper / PriceFormatter / logging equivalents |

## Verification

```bash
npm run verify   # typecheck + lint + test
npm run build    # full typecheck + RSC boundary validation
```

The ESLint config (`eslint.config.mjs`) is the **guardrail pack**: it bans raw `fetch` outside
`lib/http`, `process.env` outside `config/env.ts`, `console` outside `lib/reporting`, relative parent
imports, `any`, and non-null assertions — so the architecture can't quietly erode.

## Status (M0 in progress)

**Working and verified:** foundation (env, transport, constants, i18n, tokens), BFF auth end-to-end
with server-side gating, role-first structure with `RoleScreens` dispatch, DataTable system, form
field set, app shell, login/dashboard/settings screens. `typecheck`, `lint` and `build` are all clean.

**Still to land for M0:** the rest of the component catalog (pickers, combobox, multi-select, stepper,
stat card, OTP/phone/file fields, command menu, remaining skeletons), register/forgot/reset screens,
the `/design-system` reference page, Vitest unit tests, and the Playwright sweep harness.
