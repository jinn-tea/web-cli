@AGENTS.md

# Architecture Guide

Next.js **16** (App Router) app built on the Codeable web architecture: **external-backend
repositories, BFF cookie auth, React Query, Zustand, Zod, Tailwind v4 tokens, shadcn/ui, typed
i18n**. Read this before adding code so the structure stays consistent.

**This project** — see `jinn-web.config.json` for the roles and locales it was generated with.

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
| Validation | Zod — `features/*/models` (responses) + `features/*/validations` (forms) |
| Server state | TanStack React Query v5 |
| Client state | Zustand (session, locale) + URL state via nuqs |
| Tables | TanStack Table via `components/shared/data-table` |
| i18n | Typed in-house catalogs — `src/i18n` |
| Auth | BFF: httpOnly refresh cookie + in-memory access token |

## Core principles

1. **Server Components by default.** Add `"use client"` only for state, effects, event handlers or
   browser APIs, and push the boundary to the leaves. `AppProviders` is the app's one client root.
<!-- jinn-web:role-only:start -->
2. **Role-first, then domain.** `src/features/<role>/<domain>/`. A domain's default home is its
   role's folder; it moves to `common/` only when a **second role genuinely shares it**. Code shared
   by two domains within one role goes in `features/<role>/_shared/`. Cross-cutting code lives in
   `lib/`, `components/`, `constants/`, `validations/`, `config/`, `hooks/`, `i18n/`.
3. **No sibling imports.** Role folders may import `common/`; `common/` never imports a role folder;
   two domains never import each other. Shared layers never import `features/`.
<!-- jinn-web:role-only:end -->
<!-- jinn-web:roleless:start -->
<!--
2. **Domain-first.** `src/features/<domain>/`. This app serves a single audience, so there is no
   role segment, no `Role` type and no role machinery. Cross-cutting code lives in `lib/`,
   `components/`, `constants/`, `validations/`, `config/`, `hooks/`, `i18n/`.
3. **No sibling imports.** Two domains never import each other — a symbol both need moves UP to
   `components/shared/` (UI) or `lib/` (logic). Shared layers never import `features/`.
-->
<!-- jinn-web:roleless:end -->
4. **Zod is the source of truth** for external/user data, in **both** directions. A repository parses
   what it sends (`createOrderSchema.parse(input)`) *and* what it receives (`{ parse: orderSchema.parse }`).
   Types are always `z.infer` — never a hand-written interface beside a schema, which only drifts.
   Validation messages are **i18n keys**.
   A bare `backendClient.get<Order>(…)` is a claim TypeScript erases, so a renamed backend field
   becomes `undefined` in a component and crashes somewhere unrelated. `jinn-web doctor` flags it.
5. **Server data lives in React Query, never Zustand.** Zustand holds session identity and locale.
<!-- jinn-web:role-only:start -->
6. **Never hardcode** a display string (`t(...)`), a color (tokens), a route (`ROUTES`), a role
   (`constants/roles`), an endpoint (feature `constants.ts`), or a query key (`QUERY_KEYS`).
<!-- jinn-web:role-only:end -->
<!-- jinn-web:roleless:start -->
<!--
6. **Never hardcode** a display string (`t(...)`), a color (tokens), a route (`ROUTES`), an endpoint
   (feature `constants.ts`), or a query key (`QUERY_KEYS`).
-->
<!-- jinn-web:roleless:end -->

## Directory map

```
src/
├── proxy.ts                  # optimistic cookie gate (Next 16's renamed Middleware)
├── app/
│   ├── (auth)/               # signed-out screens, wrapped in RequireGuest
│   ├── (app)/                # authed shell: RequireAuth + AppShell (+ its own error boundary)
│   ├── api/session/          # THE only route handlers — BFF auth lifecycle
│   ├── layout.tsx · page.tsx · loading/error/not-found · globals.css
<!-- jinn-web:role-only:start -->
├── features/<role>/<domain>/ # components · api · services · models · validations · types · constants.ts
<!-- jinn-web:role-only:end -->
<!-- jinn-web:roleless:start -->
<!--
├── features/<domain>/        # components · api · services · models · validations · types · constants.ts
-->
<!-- jinn-web:roleless:end -->
│                             #   models/    = wire shapes  (what the backend RETURNS)
│                             #   validations/ = form input (what you SEND)
├── components/
│   ├── ui/                   # shadcn primitives (generated — don't hand-edit)
<!-- jinn-web:role-only:start -->
│   ├── shared/               # StatusBadge, TruncatedText, EmptyState, ErrorState,
│   │                         #   ConfirmDialog, PageHeader, SearchInput, RowActions,
│   │                         #   RoleScreens, data-table/, skeletons…
<!-- jinn-web:role-only:end -->
<!-- jinn-web:roleless:start -->
<!--
│   ├── shared/               # StatusBadge, TruncatedText, EmptyState, ErrorState,
│   │                         #   ConfirmDialog, PageHeader, SearchInput, RowActions,
│   │                         #   data-table/, skeletons…
-->
<!-- jinn-web:roleless:end -->
│   ├── form/                 # RHF field set + FormActions + FormDialog
│   ├── layout/               # AppShell, SidebarNav, UserMenu, nav-config.ts
│   └── providers/            # AppProviders — the single client boundary
├── lib/
│   ├── http/                 # backendClient, tokenStore, ApiError, pagination, server-client
│   ├── auth/                 # SESSION IS INFRASTRUCTURE: store, hooks, guards, cookies
│   ├── mutations.ts · query-client.ts · reporting.ts · datetime.ts · format.ts · badges.ts · utils.ts
├── hooks/                    # useTableParams (URL state), useDebouncedValue, …
├── i18n/                     # locales, locale-store, messages/, typed useTranslations
<!-- jinn-web:role-only:start -->
├── constants/                # roles (+ capability sets), routes, query-keys
<!-- jinn-web:role-only:end -->
<!-- jinn-web:roleless:start -->
<!--
├── constants/                # routes, query-keys
-->
<!-- jinn-web:roleless:end -->
├── validations/fields.ts     # Zod field primitives
└── config/env.ts             # the ONLY module that reads process.env
```

## Data flow

```
component → features/*/services (React Query hook)
          → features/*/api/*.repository.ts (parses BOTH directions)
          → lib/http/backendClient  (envelope unwrap · bearer · refresh-on-401 · abort · parse)
          → external backend
```

Never skip a layer, and never call `fetch` outside `lib/http` — ESLint enforces both.

### The backend contract

This app is a pure client of an external backend. It expects `NEXT_PUBLIC_API_URL` to answer with a
`{ statusCode, data, error }` envelope, which `backendClient` unwraps before parsing. **If your
backend uses a different shape, adapt `lib/http/types.ts` and `lib/http/backend-client.ts` — those
two files, and no others — before generating domains**, so every generated repository is right the
first time rather than needing a sweep afterwards.

### Models

Each domain owns `models/<entity>.model.ts`: a Zod schema plus the type inferred from it. Two
schemas, on purpose — the full model, and a narrower `…ListItemSchema` derived with `.pick()`.

**Model the response, not the entity.** If one shared shape had to satisfy every endpoint, adding a
field to a detail screen would force the backend to enrich every list endpoint returning that
entity. Narrow list rows so a frontend model never dictates backend responses.

Unknown keys are stripped, so the backend **adding** fields never breaks the client — only a field
you rely on changing shape does. When the backend is mid-rollout, reach for `.optional()`,
`.nullable()` or `.catch(fallback)` rather than dropping the parse.

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

<!-- jinn-web:role-only:start -->
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
<!-- jinn-web:role-only:end -->
<!-- jinn-web:roleless:start -->
<!--
- Session state and guards: `lib/auth` (**not** a feature — every domain needs identity).
- `features/auth` holds only the login/register **screens**.
- **Gating is UX, not security.** `proxy.ts` and `RequireAuth` decide what to *render*; the backend
  authorizes every request.

## Single audience

This project has **no roles**, and the machinery that would serve them is genuinely absent — there
is no `constants/roles.ts`, no `Role` union, no `RoleGroup`, no `RequireRole` and no `RoleScreens`.
Don't reach for them, and don't reintroduce them by hand.

- Features live flat: `src/features/<domain>/`, with the auth screens at `src/features/auth`.
- Endpoints are plain paths in each feature's `constants.ts`; query keys aren't group-scoped.
- Sidebar entries are `NAV_ITEMS` in `components/layout/nav-config.ts`, with no visibility filter.

**It isn't a one-way door.** `jinn-web role <name>` migrates the project: it introduces
`constants/roles.ts`, moves every feature under `features/<role>/`, rewrites the imports, and then
reports each `Record<Role, …>` the compiler now finds incomplete as a todo list. Build flat until
a second audience is real.
-->
<!-- jinn-web:roleless:end -->

## Where things go

| Adding… | Goes |
|---|---|
<!-- jinn-web:role-only:start -->
| A domain | `jinn-web domain <name> --role <role>` (emits + wires routes, keys, nav, i18n) |
| A role | `jinn-web role <name>`, then fix every compile error it surfaces |
| A page | `src/app/(app)/<name>/page.tsx` — thin; dispatch with `RoleScreens` if role-varying |
<!-- jinn-web:role-only:end -->
<!-- jinn-web:roleless:start -->
<!--
| A domain | `jinn-web domain <name>` (emits + wires routes, keys, nav, i18n) |
| A page | `src/app/(app)/<name>/page.tsx` — thin: render the feature's screen and nothing else |
-->
<!-- jinn-web:roleless:end -->
| A backend field | the schema in `features/*/models/*.model.ts` — the type follows via `z.infer` |
<!-- jinn-web:role-only:start -->
| A shared component | 2+ domains in one role → `features/<role>/_shared/`; across roles → `components/shared/` |
<!-- jinn-web:role-only:end -->
<!-- jinn-web:roleless:start -->
<!--
| A shared component | used by a 2nd domain → `components/shared/`; until then it stays local |
-->
<!-- jinn-web:roleless:end -->
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
**skeletons**, never a screen spinner. Errors show `ApiError.message` and offer retry. A
`ParseError` deliberately shows the generic message instead — a field path is a developer's
problem, and it's already in the log with the endpoint that produced it. Destructive
actions confirm via `ConfirmDialog`. Submit buttons disable while pending. `DataTable` gives you all
of this for lists — use it rather than hand-rolling a table.

## Code quality

### Definition of done

A change is done when it **runs**, not when it compiles. `npm run verify` (typecheck + lint + tests)
is the floor, not the finish line — a green typecheck says nothing about whether the screen renders,
whether the empty state appears, or whether a long value shears the layout. Open the page in a
browser, exercise the loading / empty / error / loaded states, and only then call it finished.

Before committing:

1. `npm run verify` passes.
2. The screen was actually opened and exercised.
3. `jinn-web doctor` passes, if you touched routes, query keys, nav or catalogs.
4. New strings exist in **every** locale catalog (a missing key is a compile error — don't silence
   it by copying English into the other file and calling it translated; mark it `TODO(<locale>)`).

### TypeScript

- **No `any`** and **no non-null `!`** — both are lint errors. Narrow with a type guard, or make the
  type honest. `unknown` plus a guard is almost always the right replacement.
- **No hand-written interface beside a schema.** `z.infer<typeof schema>` only; two declarations of
  one shape drift, and the one that drifts is never the one you're reading.
- **`as` is a smell**, not a tool. The exception is `as const` on literal tables.
- **Discriminated unions over boolean flags.** `{ status: "loading" } | { status: "error"; error }`
  makes the impossible state unrepresentable; `isLoading && isError` invites it.
- Prefer `type` for unions and object shapes; `interface` when something genuinely extends.
- Exported functions get explicit return types. Inference inside a function body is fine; inference
  across a module boundary is how a refactor silently changes a public contract.

### React

- **Never fetch in `useEffect`.** Server state comes from a React Query hook in
  `features/*/services`. An effect that fetches re-races itself, ignores caching, and has no
  cancellation.
- **Derive, don't synchronise.** If a value can be computed from props or query data, compute it
  during render. An effect that copies one piece of state into another is a bug with a delay.
- **`useEffect` is for real subscriptions** — an event listener, a timer, an imperative browser API —
  and each one returns a cleanup.
- **Pages are thin.** A `page.tsx` renders one screen component and nothing else: no data fetching,
  no layout logic, no conditionals.
- **Extract a hook when there is state plus behavior**, not merely to shorten a file. A component
  under ~200 lines with one `useState` is fine as it is.
- Keys are stable ids, never array indexes.
- URL-worthy state (page, search, sort, filters) belongs in the URL via `useTableParams`, so a
  filtered list survives a refresh and can be shared.

### Naming

| Thing | Convention | Example |
|---|---|---|
| Files & folders | kebab-case | `order-form-dialog.tsx` |
| Components | PascalCase, file named after it | `OrdersScreen` → `orders-screen.tsx` |
| Hooks | `use-` prefix, one hook per concern | `use-orders.ts` → `useOrders` |
| Repositories | `<domain>.repository.ts` | `orders.repository.ts` |
| Wire models | `<entity>.model.ts` (singular) | `order.model.ts` |
| Form schemas | `<domain>.schema.ts` | `orders.schema.ts` |
| Constants | `SCREAMING_SNAKE` | `DEFAULT_PAGE_SIZE` |
| Booleans | `is` / `has` / `can` prefix | `isPending`, `canEdit` |
| Handlers | `handleX` in the component, `onX` in the prop | `onSelect={handleSelect}` |

Say what it is, not what it's made of: `OrdersTable`, not `OrdersDataComponent`.

### Errors

- **Throw typed errors.** `ApiError` (backend said no), `NetworkError` (never arrived),
  `ParseError` (arrived in the wrong shape). Guards: `isApiError`, `isNetworkError`, `isParseError`.
- **Never swallow.** `catch {}` with an empty body deletes the only evidence. If a failure is
  genuinely fine to ignore, say so in a comment explaining why.
- **`console` is banned** outside `lib/reporting.ts` — lint enforces it. Report through
  `reportError(error, { scope })` so production has one seam to wire.
- Mutations go through `useApiMutation`, which toasts `ApiError.message`, reports, and invalidates.
  Reach past it only for optimistic updates.
- User-facing error text is an i18n key. A raw string in a `catch` block is a bug in two languages.

### Testing

Test the things that are cheap to get wrong and expensive to notice:

- Zod schemas: the boundary cases the backend will eventually send (`null`, missing, wrong type).
- Pure logic: formatters, mappers, permission predicates, anything in `lib/`.
- Hooks with real branching.

Don't unit-test that a component renders its props, and don't mock the whole transport to assert a
repository calls it — that tests the mock. End-to-end coverage of a critical flow lives in `e2e/`.

### Performance

Correctness first: nearly every perceived slowness here is a waterfall or a missing `staleTime`, not
a render cost.

- Reach for `useMemo`/`useCallback` when a dependency identity actually matters (a memoised child, an
  effect dependency) or the computation is genuinely expensive. Wrapping every function is noise that
  hides the two places it mattered.
- Keep `"use client"` at the leaves — a client boundary high in the tree drags the subtree with it.
- Import icons individually; never re-export a barrel of them.
- Paginate on the server. A table that loads every row works beautifully until the data is real.

### Workflow

- `npm run format` then `npm run verify` before you commit.
- **Don't hand-edit generated wiring.** `constants/routes.ts`, `constants/query-keys.ts`,
  `components/layout/nav-config.ts` and the locale catalogs are maintained by the generators —
  adding a domain by hand is how they drift out of sync. Use `jinn-web domain`, and
  `jinn-web remove-domain` to undo it.
- `src/components/ui/**` is shadcn output. Restyle via tokens in `globals.css`, don't fork the file.
- Adding a dependency is a decision: check whether `lib/` already does it.

## Commands

```bash
npm run dev         # dev server (Turbopack)
npm run build       # production build + full typecheck
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (architecture guardrails)
npm run test        # vitest
npm run verify      # typecheck + lint + test
```
