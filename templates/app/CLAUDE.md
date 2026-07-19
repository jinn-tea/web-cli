@AGENTS.md

# Architecture Guide

Next.js **16** (App Router) app built on the Codeable web architecture: **role-first features,
external-backend repositories, BFF cookie auth, React Query, Zustand, Zod, Tailwind v4 tokens,
shadcn/ui, typed i18n**. Read this before adding code so the structure stays consistent.

> ⚠️ This is Next.js 16 (Turbopack). APIs differ from older versions — notably **Middleware is now
> Proxy** (`src/proxy.ts`). When unsure, read `node_modules/next/dist/docs/`.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 App Router (`src/app`) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, tokens in `src/app/globals.css` |
| UI components | shadcn/ui (Radix, Nova preset) — `src/components/ui` |
| Icons | lucide-react |
| Validation | Zod — `src/validations` + `features/*/validations` |
| Server state | TanStack React Query v5 |
| Client state | Zustand (session, locale) + URL state via nuqs |
| Tables | TanStack Table via `components/shared/data-table` |
| i18n | Typed in-house catalogs — `src/i18n` |
| Auth | BFF: httpOnly refresh cookie + in-memory access token |

## Core principles

1. **Server Components by default.** Add `"use client"` only for state, effects, event handlers or
   browser APIs, and push the boundary to the leaves. `AppProviders` is the app's one client root.
2. **Role-first, then domain.** `src/features/<role>/<domain>/`. A domain's default home is its
   role's folder; it moves to `common/` only when a **second role genuinely shares it**. Code shared
   by two domains within one role goes in `features/<role>/_shared/`. Cross-cutting code lives in
   `lib/`, `components/`, `constants/`, `types/`, `validations/`, `config/`, `hooks/`, `i18n/`.
3. **No sibling imports.** Role folders may import `common/`; `common/` never imports a role folder;
   two domains never import each other. Shared layers never import `features/`.
4. **Zod is the source of truth** for external/user data. Forms and repositories parse with the same
   schema; types are `z.infer`. Validation messages are **i18n keys**.
5. **Server data lives in React Query, never Zustand.** Zustand holds session identity and locale.
6. **Never hardcode** a display string (`t(...)`), a color (tokens), a route (`ROUTES`), a role
   (`constants/roles`), an endpoint (feature `constants.ts`), or a query key (`QUERY_KEYS`).

## Directory map

```
src/
├── proxy.ts                  # optimistic cookie gate (Next 16's renamed Middleware)
├── app/
│   ├── (auth)/               # signed-out screens, wrapped in RequireGuest
│   ├── (app)/                # authed shell: RequireAuth + AppShell
│   ├── api/session/          # THE only route handlers — BFF auth lifecycle
│   ├── layout.tsx · page.tsx · loading/error/not-found · globals.css
├── features/<role>/<domain>/ # components · api · services · validations · types · constants.ts
├── components/
│   ├── ui/                   # shadcn primitives (generated — don't hand-edit)
│   ├── shared/               # StatusBadge, TruncatedText, EmptyState, ErrorState,
│   │                         #   ConfirmDialog, PageHeader, SearchInput, RowActions,
│   │                         #   RoleScreens, data-table/, skeletons…
│   ├── form/                 # RHF field set + FormActions + FormDialog
│   ├── layout/               # AppShell, SidebarNav, UserMenu, nav-config.ts
│   └── providers/            # AppProviders — the single client boundary
├── lib/
│   ├── http/                 # backendClient, tokenStore, ApiError, pagination, server-client
│   ├── auth/                 # SESSION IS INFRASTRUCTURE: store, hooks, guards, cookies
│   ├── mutations.ts · query-client.ts · reporting.ts · datetime.ts · format.ts · badges.ts · utils.ts
├── hooks/                    # useTableParams (URL state), useDebouncedValue, …
├── i18n/                     # locales, locale-store, messages/, typed useTranslations
├── constants/                # roles (+ capability sets), routes, query-keys
├── validations/fields.ts     # Zod field primitives
└── config/env.ts             # the ONLY module that reads process.env
```

## Data flow

```
component → features/*/services (React Query hook)
          → features/*/api/*.repository.ts (Zod-validated, typed)
          → lib/http/backendClient  (envelope unwrap · bearer · refresh-on-401 · abort)
          → external backend
```

Never skip a layer, and never call `fetch` outside `lib/http` — ESLint enforces both.

## Auth (BFF model) — read this before touching sessions

The browser **never holds the refresh token**.

```
login    → POST /api/session      → backend → refresh token into an httpOnly cookie,
                                    access token returned to memory only
reload   → POST /api/session/refresh (cookie rides along) → new access token + user
401      → transport refreshes once, single-flight, then replays the request
logout   → DELETE /api/session    → cookie cleared
```

Why it's built this way: an XSS payload can't read an httpOnly cookie, and a cookie is visible to
the server — which is what lets `proxy.ts` redirect unauthenticated requests *before* rendering, and
what makes server-side prefetching possible. A localStorage bearer token forfeits all of that.

- Session state, guards and role hooks: `lib/auth` (**not** a feature — every domain needs identity).
- `features/common/auth` holds only the login/register **screens**.
- **Gating is UX, not security.** `proxy.ts` and `RequireAuth`/`RequireRole` decide what to *render*;
  the backend authorizes every request.

## Multi-role

- `constants/roles.ts` is the single source of truth: `ROLES` tuple → `Role` union, `ROLE_TO_GROUP`
  (backend URL groups), `ROLE_LABEL_KEYS`, capability sets. Every map is a `Record<Role, …>`, so
  **adding a role turns each incomplete map into a compile error** — `tsc` gives you the todo list.
- One URL, N surfaces → `<RoleScreens screens={{ admin: …, member: … }} />`. Pages stay thin.
- Role-shared endpoints are **parameterized by group** (`ordersEndpoints(group)`), never forked per
  role. Query keys are role-group-scoped so one role's cache can't serve another's rows.
- Sidebar visibility is data: `NAV_ITEMS[].roles` in `components/layout/nav-config.ts`.

## Where things go

| Adding… | Goes |
|---|---|
| A domain | `jinn-web domain <name> --role <role>` (emits + wires routes, keys, nav, i18n) |
| A role | `jinn-web role <name>`, then fix every compile error it surfaces |
| A page | `src/app/(app)/<name>/page.tsx` — thin; dispatch with `RoleScreens` if role-varying |
| A shared component | 2+ domains in one role → `features/<role>/_shared/`; across roles → `components/shared/` |
| A shadcn primitive | `npx shadcn@latest add <name>` |
| An env var | the Zod schema in `config/env.ts` (browser vars need `NEXT_PUBLIC_`) |
| A display string | `i18n/messages/en.ts` first, then `t("...")` |
| A date/number format | `lib/datetime.ts` / `lib/format.ts` — add it there, then use it |

## Styling

Everything is token-driven in `globals.css` — **never hardcode a hex in a component**.

- Semantic slots (`bg-primary`, `text-foreground`, `bg-card`, `border`, `ring`), brand ramp
  (`brand-50…950`), status tones (`success|warning|danger|info|neutral`, each with `-subtle`,
  `-subtle-foreground`, `-border`), `chart-1..5`, sidebar tokens.
- Typography classes instead of re-picking sizes: `text-display/h1/h2/h3/h4/body/body-lg/label/
  caption/overline/data/metric`.
- Status pills only via `<StatusBadge tone="…">`. Merge classes with `cn()`.
- Dark mode is **structurally complete but disabled** — tokens exist for `.dark`, nothing sets it.
  Consume semantic slots (not raw ramp steps) for surfaces so enabling it stays a one-switch change.

**Long text must never widen a container.** A flex/grid item's automatic minimum size is its
min-content, so one 80-character name silently sizes its track past the container and an
`overflow-hidden` ancestor shears the layout. Fixed-width containers pin children with `min-w-0`;
`truncate` needs `overflow-hidden` on the same box; and a truncated value needs a way to see the
rest — use `<TruncatedText>`. This is invisible to `tsc` and to review: verify with a
pathologically long string in a browser.

## UX bar

Every async surface ships **loading / empty / error / loaded**. Loading is layout-matching
**skeletons**, never a screen spinner. Errors show `ApiError.message` and offer retry. Destructive
actions confirm via `ConfirmDialog`. Submit buttons disable while pending. `DataTable` gives you all
of this for lists — use it rather than hand-rolling a table.

## Commands

```bash
npm run dev         # dev server (Turbopack)
npm run build       # production build + full typecheck
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (architecture guardrails)
npm run test        # vitest
npm run verify      # typecheck + lint + test
```
