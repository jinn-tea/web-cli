# Codeable Web Template

The golden template `jinn-web create` emits. It is a **real, runnable Next.js 16 app** — build
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
npm run verify   # typecheck + lint + unit tests
npm run build    # full typecheck + RSC boundary validation
npm run sweep    # Playwright sweep (boots its own dev server)
```

**The sweep is not a feature test suite** — it's a systematic pass for the defect
classes static analysis cannot see: layout shear from long strings, clipped values with no way to
reveal them, unnamed controls, missing validation, broken auth redirects. It runs every check at
desktop and mobile widths.

It has already paid for itself: it caught a bug where `TruncatedText` measured itself correctly,
set its clipped flag, then re-parented the span into the tooltip trigger — detaching the node its
`ResizeObserver` was watching, which fired at 0×0 and reset the flag. Truncated values silently
never got a tooltip. Nothing in `tsc`, ESLint or a unit test would have found that.

The ESLint config (`eslint.config.mjs`) is the **guardrail pack**: it bans raw `fetch` outside
`lib/http`, `process.env` outside `config/env.ts`, `console` outside `lib/reporting`, relative parent
imports, `any`, and non-null assertions — so the architecture can't quietly erode.

## Status — M0 essentially complete

**Working and verified end to end:** foundation (env, transport, constants, i18n, tokens), BFF auth
with real server-side gating, role-first structure with `RoleScreens`, the DataTable system on URL
state, ~29 shared components, 11 form fields, the app shell, login/dashboard/settings screens, an
`admin/orders` reference domain (full CRUD), and the `/design-system` reference.

`typecheck`, `lint`, 22 unit tests, `build`, and 28 sweep checks all pass.

**Optional extras not yet built:** OTP / phone / file-upload fields, command palette (`⌘K`),
register / forgot-password / reset-password screens, and an authed sweep (needs seeded test
credentials). None of these block the CLI work — add them when a project first needs one.
