# 02 — The Golden Template

The template is 70% of the CLI's value. It is the web equivalent of the Flutter CLI's generated
app (128 Dart files, `DataState`/`execute()`/`ApiService`/~40 core widgets/l10n/flavors, all
pre-wired) — and it must hold the same bar: **a fresh `jinn-web create` output passes
`/web-audit` with zero findings and every `jinn-web-quality` rule.**

It lives in the CLI repo at `templates/app/`. Files needing variable substitution carry an
`.eta` suffix (stripped on render); everything else is copied verbatim. This doc specifies every
file.

> **lucas_web is the donor, not the blueprint.** Extract verbatim what's proven there — the
> envelope transport, typed i18n, `roles.ts` capability sets, token discipline, the overflow
> rules. But the template deliberately **redesigns** the parts lucas_web inherited as
> constraints: (1) **BFF-lite cookie auth** instead of localStorage bearer (§3a) — enabling
> middleware gating, server prefetch, and XSS-safe sessions against the same bearer backends;
> (2) **auth as infrastructure** in `lib/auth/` — never a peer feature siblings import;
> (3) **URL-as-state** for list screens via `nuqs`; (4) a unified **DataTable** on TanStack
> Table; (5) declarative **`<RoleScreens>`** dispatch; (6) **dark-ready tokens** (light-enabled);
> (7) shared **mutation helpers**; (8) an **observability seam** (`lib/reporting.ts`).

---

## 1. Top-level output tree

```
<project>/
├── src/                          # §2–§8
├── public/                       #   favicon.ico, icon.svg, apple-icon.png, logo placeholder
├── e2e/                          # §10 Playwright sweep harness
├── .claude/                      # §9 AI config
├── jinn-web.config.json          # CLI state (doc 01 §8)
├── package.json                  # §11 pinned deps, scripts
├── tsconfig.json                 # strict: true, @/* → src/*, noUncheckedIndexedAccess
├── next.config.ts
├── postcss.config.mjs            # Tailwind v4 pipeline
├── eslint.config.mjs             # §12 — imports the guardrail pack
├── components.json               # shadcn config (Nova preset, CSS variables)
├── vitest.config.ts  playwright.config.ts
├── .env.example  .env.local      # NEXT_PUBLIC_API_URL=<api-url from create>
├── .gitignore  .prettierrc  README.md  CLAUDE.md
```

## 2. `src/` skeleton

```
src/
├── middleware.ts                         # optimistic gate: session cookie present? → else /login redirect
│                                         #   (cookie-only check, no fetches; possible because of §3a)
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                    # centered card shell + <RequireGuest>
│   │   └── login/page.tsx                # working login against /auth endpoints
│   ├── (app)/
│   │   ├── layout.tsx                    # <RequireAuth> + <AppShell>  (server layout; prefetches current user)
│   │   ├── dashboard/page.tsx            # <RoleScreens> starter page (§6)
│   │   └── settings/page.tsx             # profile + language switcher + logout
│   ├── api/session/route.ts              # §3a BFF-lite: login/refresh/logout ↔ httpOnly cookie
│   ├── design-system/page.tsx            # token/type/status/component reference; notFound() in prod
│   ├── layout.tsx                        # root: fonts (next/font Geist), <AppProviders>, metadata
│   ├── page.tsx                          # "/" → redirect by auth status
│   ├── loading.tsx  error.tsx  not-found.tsx   # error.tsx reports via lib/reporting
│   └── globals.css                       # §7 tokens (brand ramp rendered from --brand; dark-ready)
├── features/                             # §5–§6 role-first
│   ├── common/auth/                      # login/register/forgot SCREENS only (§5 — session logic lives in lib/auth)
│   └── <role>/…                          # per --roles: starter domain + _shared/
├── components/
│   ├── ui/                               # shadcn primitives (§4 list)
│   ├── shared/                           # §4 cross-feature inventory (incl. DataTable system, RoleScreens)
│   ├── form/                             # TextField, SelectField, FormActions…
│   ├── layout/                           # AppShell, Sidebar, Topbar, UserMenu, nav-config.ts
│   └── providers/app-providers.tsx       # single client boundary: QueryProvider + NuqsAdapter + Toaster
├── lib/
│   ├── http/                             # §3 transport
│   ├── auth/                             # §3a AUTH IS INFRASTRUCTURE: session store, useCurrentRole/
│   │                                     #   useRoleGroup, RequireAuth/RequireGuest/RequireRole,
│   │                                     #   session lifecycle (persist/clear/initAuthTransport)
│   ├── mutations.ts                      # createMutationHelpers(keys): invalidate + ApiError toast + optimistic slot
│   ├── reporting.ts                      # no-op observability seam: captureError/captureMessage
│   │                                     #   (called from error.tsx, transport, query-cache onError)
│   ├── query-client.ts  utils.ts (cn)  datetime.ts  badges.ts  permissions.ts
├── hooks/                                # use-debounced-value.ts, use-reduced-motion.ts,
│                                         #   use-table-params.ts (nuqs: page/sort/q typed searchParams)
├── i18n/                                 # §8
├── constants/                            # routes.ts, query-keys.ts, roles.ts, index.ts
├── validations/                          # fields.ts (email/password/name/phone primitives)
├── config/env.ts                         # Zod-validated env (client vars NEXT_PUBLIC_ only)
├── types/index.ts                        # shared domain vocabulary only (starts near-empty, documented bar)
└── api.ts                                # backend-surface index; create seeds it with auth endpoints
```

## 3a. Auth — BFF-lite cookie model (`app/api/session` + `lib/auth/`)

The template's biggest deliberate upgrade over lucas_web. Works against the **same bearer-token
backends unchanged** — the browser just never holds the refresh token:

```
Login:    LoginForm → POST /api/session (route handler) → backend /auth/login
          → route handler SETS httpOnly cookie { refreshToken } + returns { user, accessToken }
          → access token kept in memory (lib/auth session store)
Refresh:  transport 401 → POST /api/session/refresh (cookie goes along automatically)
          → handler calls backend refresh → rotates cookie → returns new access token (single-flight, §3)
Server:   middleware.ts reads ONLY cookie presence (optimistic gate, zero fetches);
          (app)/layout.tsx (Server Component) can call backend with the refresh flow server-side
          → prefetch current user / public data → <HydrationBoundary> (real server-first)
Logout:   POST /api/session/logout → clears cookie + backend invalidation; store cleared
```

- **`lib/auth/`** owns everything identity: `session-store.ts` (Zustand, NOT persisted; user +
  accessToken + status), `use-current-role.ts` (`useCurrentRole()`/`useRoleGroup()` selectors),
  `require-auth.tsx` / `require-guest.tsx` / `require-role.tsx`, `session.ts`
  (persist/clear/initAuthTransport). **Features never import a peer feature for identity** —
  the lucas_web `common/auth` coupling class is impossible by construction.
- `features/common/auth/` keeps only the **screens** (login/register/forgot forms), their
  schemas, and the auth endpoints constant.
- The session route handler is the **only** route handler; it stays thin (validate with the
  shared Zod schema → call backend → set/clear cookie). Cookie: `httpOnly`, `secure`,
  `sameSite: "lax"`, path-scoped to `/api/session`.
- `create --auth client` opts out to the pure-client lucas model (tokenStore + localStorage, no
  middleware) for projects that must mirror a mobile contract exactly; the file shape stays
  identical so switching later is contained.

## 3. Transport — `src/lib/http/` (the `ApiService`+`execute()` equivalent)

Extract from lucas_web, de-branded. Files and exact responsibilities:

| File | Contract |
|---|---|
| `backend-client.ts` | `backendClient.get/post/put/patch/delete<T>(path, opts)`. Base URL from `clientEnv.NEXT_PUBLIC_API_URL`. Unwraps the `{ statusCode, data, error }` envelope → returns `data` or throws `ApiError`. Injects `Authorization: Bearer` from `tokenStore`; sends `Accept-Language` from `getLocale()`. **Single-flight refresh-on-401** then replays once. Forwards `AbortSignal` (`opts.signal`) — required by quality rule DS-008. `getBlob(path)` for file downloads. |
| `token-store.ts` | Framework-agnostic token holder (memory + localStorage), `get/set/clear`. The ONLY place tokens live (SM-003). |
| `refresh.ts` | `setTokenRefresher(fn)` / `setOnSessionExpired(fn)` — transport owns no endpoint strings; wired once by `auth.session.ts`. |
| `errors.ts` | `ApiError { statusCode, message }`, `NetworkError`, `isApiError()`. |
| `pagination.ts` | `normalizePagination(raw)`: snake_case `{ current_page, total_pages, total_items }` → `Pagination { currentPage, totalPages, totalItems, hasMore }` — the `PaginationModel` equivalent. |
| `types.ts` | `Envelope<T>`, `Paginated<T>`, wire types. Never imported outside `lib/http` + repositories. |
| `index.ts` | Barrel. |

## 4. Component & helper inventory — the plug-and-play layer (core_widgets parity)

The Flutter CLI ships ~40 core widgets + ~20 helpers; this is the full web equivalent. Every
item below **ships in the template, working and i18n-clean** — a scaffolded app has the same
"reach for it, it exists" experience as a Codeable Flutter app. Where a lucas_web implementation
exists, extract it; the rest are built once for the template.

**4.1 `components/ui/` — shadcn primitives, installed at template-build time** (generated,
never hand-edited): `button input textarea select checkbox switch radio-group label form dialog
alert-dialog dropdown-menu popover tooltip command table skeleton badge card tabs sheet
separator avatar sonner calendar breadcrumb pagination scroll-area toggle-group collapsible`
(~28; more via `npx shadcn add`).

**4.2 `components/shared/` — the core widget catalog.** One file each, kebab-named, typed props,
tokens-only styling, every display string via `t(...)`:

| Component | Flutter analog | Contract |
|---|---|---|
| `status-badge.tsx` | enum-extension colors | `tone: "success"\|"warning"\|"danger"\|"info"\|"neutral"` → dot + label, subtle tokens. Only way to render status (CC-003). |
| `truncated-text.tsx` | ellipsis + affordance | truncate + tooltip/popover full value (CC-007, ST-005). |
| `empty-state.tsx` | `EmptyStateWidget` | icon + i18n title/hint + optional CTA. |
| `error-state.tsx` | `CustomRetryWidget` | `ApiError` message + retry wired to `refetch`. |
| `confirm-dialog.tsx` | `CustomConfirmationDialog` | promise-based `confirm()` + destructive variant (CC-002). |
| `page-header.tsx` | `customAppBar` | title/description/breadcrumbs/primary-action slot — one per screen. |
| `section-header.tsx` | `CustomSectionTitle` | section title + optional "See all" action. |
| **`data-table/`** | `PaginatedListView` | **the system component** (§4.3). |
| `search-input.tsx` | `CustomSearchField` | debounced via `useDebouncedValue`, clears, `⌘K`-focusable (DS-008). |
| `row-actions.tsx` | tile trailing menu | kebab `DropdownMenu` for table rows (edit/delete/custom). |
| `user-avatar.tsx` | `UserAvatar` | image → initials fallback, deterministic color from name seed. |
| `avatar-stack.tsx` | `StackedImages` | overlapping avatars + `+N` overflow. |
| `app-image.tsx` | `CachedNetworkImage` | `next/image` wrapper: placeholder, error fallback, no CLS. |
| `date-picker.tsx` / `date-range-picker.tsx` / `time-picker.tsx` | `CustomDatePicker`/`TimePicker`/`CustomCalendar` | shadcn Calendar + Popover, locale-aware via `lib/datetime`, RHF-compatible. |
| `combobox.tsx` | `SearchableDropdown` | async-searchable single select (query hook + debounce + `signal`). |
| `multi-select.tsx` | `MultiSelectDropdown` | chips-in-trigger multi select. |
| `filter-chips.tsx` | `SelectableChip` | single/multi chip group, controlled, URL-state friendly. |
| `segmented-tabs.tsx` | `CustomSlidingTab` | ToggleGroup-based segmented control for view switching. |
| `stepper.tsx` + `progress-dots.tsx` | `StepHeader`/`StepProgressBar`/`ProgressDashes` | multi-step flows: numbered stepper + dots variant. |
| `stat-card.tsx` | dashboard KPI tile | label + `text-metric` value + delta badge + optional sparkline slot. |
| `description-list.tsx` | detail rows | label/value grid for detail screens; `TruncatedText` values. |
| `settings-section.tsx` + `settings-row.tsx` | `SettingsSection`/`SettingsTile` | settings screens: section card + icon/label/control rows. |
| `otp-input.tsx` | `OtpInputField` | segmented one-time-code input (`autoComplete="one-time-code"`). |
| `phone-input.tsx` | `CustomPhoneField` | country picker + national formatting, RHF-compatible. |
| `password-input.tsx` | password field | visibility toggle + optional strength hint. |
| `file-dropzone.tsx` | image/file picker | drag-drop + browse, size/type validation (Zod), previews. |
| `copy-button.tsx` | — (web-native) | `lib/clipboard` copy + success toast; wraps ids/tokens/`text-data` values. |
| `star-rating.tsx` | `StarRating` | display + input modes, keyboard operable. |
| `social-auth-button.tsx` | `SocialAuthButton` | Google/Apple branded buttons for the auth screens. |
| `command-menu.tsx` | — (web-native) | `⌘K` cmdk palette: nav items (role-filtered) + per-domain actions registry. |
| `role-screens.tsx` | — | `<RoleScreens screens={{admin: <A/>, …}}>` — declarative role dispatch, exhaustiveness-checked (§6). |
| `full-page-loader.tsx`, `language-switcher.tsx`, `country-flag.tsx`, `brand-mark.tsx` | — | as in lucas_web. |
| Skeletons: `table-skeleton-rows.tsx`, `card-skeleton.tsx`, `form-skeleton.tsx`, `detail-skeleton.tsx` | shimmer widgets | layout-matching skeletons per surface shape (22.2 — spinner-for-screen is banned). |

**4.3 The DataTable system — `components/shared/data-table/`** (TanStack Table v8):
`data-table.tsx` (generic `<DataTable columns data />`), `use-data-table.ts` (wires sorting /
pagination / column visibility to **URL state via `use-table-params.ts`/nuqs**), plus
`data-table-pagination.tsx`, `data-table-column-header.tsx` (sort affordance),
`data-table-view-options.tsx` (column toggle). Built-in states: `TableSkeletonRows` while
loading, `EmptyState`/`ErrorState` slots, sticky header, `TruncatedText` default cell, row
`onClick` + `RowActions` column helper, optional row selection for bulk actions. Server-driven:
sort/page/q params feed the query key; `keepPreviousData` prevents flashes. **A domain list
screen composes this in ~30 lines** — this is what the `domain` generator emits against.

**4.4 `components/form/`** — RHF + `zodResolver` field set, error messages resolved as i18n keys
through `FormMessage`: `text-field.tsx`, `textarea-field.tsx`, `select-field.tsx`,
`combobox-field.tsx`, `checkbox-field.tsx`, `switch-field.tsx`, `date-field.tsx`,
`phone-field.tsx`, `file-field.tsx`, `form-actions.tsx` (submit disabled while `pending` —
VW-007), `form-dialog.tsx` (Dialog + form + actions shell the `dialog -t form` generator wraps).

**4.5 `components/layout/`** — `app-shell.tsx`, `sidebar.tsx` (collapsible, role-filtered),
`topbar.tsx` (breadcrumbs + command-menu trigger + user menu), `user-menu.tsx`, and
**`nav-config.ts`**: `NAV_ITEMS: readonly NavItem[]` where `NavItem = { href, labelKey, icon,
roles: "all" | readonly Role[] }` + `navItemsForRole(role)`. This array is a **codemod wiring
point** (doc 05).

**4.6 `lib/` + `hooks/` helpers — the DateTimeHelper/StringHelpers/PriceFormatter layer:**

| Module | Flutter analog | Contract |
|---|---|---|
| `lib/datetime.ts` | `DateTimeHelper` (40+ methods) | ALL date/time formatting: `formatDate/formatDateTime/formatTime/formatRelative/formatDateRange/formatApiDate`… — `Intl`-based, fed the active locale via `getLocale()`. New format needed → **add it here first** (CC-005 analog). |
| `lib/format.ts` | `PriceFormatter`/`StringHelpers` | `formatCurrency(amount, ccy)`, `formatNumber`, `formatCompact` (1.2k), `formatPercent`, `formatBytes`, `initials(name)`, `titleCase`. Locale-aware; plurals stay in i18n. |
| `lib/mutations.ts` | — | `createMutationHelpers(keys)`: standard `onSuccess` invalidation + `ApiError.message` toast + optimistic-update slot — the `execute()`-style boilerplate killer every generated mutation uses. |
| `lib/reporting.ts` | `AppLogger` | `reportError/reportMessage/logDebug` — console in dev, no-op seam for Sentry in prod; called from `error.tsx`, transport, query-cache `onError`. The only sanctioned console path (CC-006). |
| `lib/clipboard.ts` | — | `copyToClipboard(text)` + toast; used by `CopyButton`. |
| `lib/download.ts` | — | authenticated blob download → file save (pairs with transport `getBlob`). |
| `lib/badges.ts` | enum extensions | shared `Record<Union, Tone>` tone maps for `StatusBadge` (TV-005). |
| `lib/permissions.ts` | — | per-action role capability tables (`can(role, "orders.delete")`). |
| `hooks/use-table-params.ts` | — | nuqs-typed `{ page, sort, q, …filters }` searchParams state — list screens' single state source. |
| `hooks/use-debounced-value.ts`, `hooks/use-reduced-motion.ts`, `hooks/use-disclosure.ts` | — | debounce (DS-008), motion preference (22.5), open/close state helper for dialogs. |
| `validations/fields.ts` | `FieldValidators` | Zod primitives: `emailField/passwordField/nameField/phoneField/urlField` — every schema composes these, messages are i18n keys. |

## 5. The canonical domain — `features/common/auth/` (fully working, not a stub)

The Flutter template ships a working onboarding/login; ours ships working auth against the
standard backend contract:

```
features/common/auth/
├── api/auth.repository.ts       # login, register, me, forgot/reset — pure, Zod-parsed
│                                #   (session/refresh lifecycle lives in lib/auth + /api/session — §3a)
├── services/use-auth.ts         # useLogin/useLogout/useCurrentUser mutations+query
├── components/                  # login-form.tsx, register-form.tsx, forgot-password-form.tsx
├── validations/auth.schema.ts   # Zod schemas; messages are i18n keys
├── types/index.ts               # AuthUser, CurrentUser (AuthSession lives in lib/auth)
└── constants.ts                 # authEndpoints (group-parameterized where roles differ)
```

Note what is **not** here (vs lucas_web): the session store, `RequireAuth`/`RequireRole`, and
token lifecycle — all in `lib/auth/` (§3a), so no sibling domain ever imports `common/auth`.

Every generated domain (doc 05) mirrors this file naming exactly (AR-008).

## 6. Roles wiring (rendered from `--roles`)

> **Roleless projects (`--no-roles`).** Everything role-shaped is simply absent:
> no `constants/roles.ts`, no `RoleScreens`, no `RequireRole`, no `roles` field
> on nav items, and features sit flat at `features/<domain>/`. Twelve template
> files carry `jinn-web:role-only` / `jinn-web:roleless` marker regions
> (`src/engine/role-blocks.ts`) resolved at generation time — one transform
> rather than a second copy of each file or a per-file subtractive regex. The
> `roleless` blocks are commented out in the template so it stays runnable and
> sweepable. `jinn-web role <name>` later migrates a roleless project to
> role-first; see doc 05 §4.

- `constants/roles.ts.eta` renders: `ROLES` as const tuple from the answer, `Role` union,
  `ROLE_LABEL_KEYS: Record<Role, MessageKey>`, `DEFAULT_AUTHED_ROUTE`, and an exhaustiveness
  guard (`const _check: Record<Role, true> = …` pattern) so `jinn-web role` additions force
  compile-time completion everywhere.
- Per role: `features/<role>/_shared/.gitkeep` + a starter domain (doc 05 generator invoked by
  create, exactly like the Flutter CLI generates `<role>_onboarding` per role).
- `(app)/dashboard/page.tsx.eta` renders the declarative dispatch pattern:
  `<RoleScreens screens={{ admin: <AdminDashboard/>, customer: <CustomerDashboard/> }} />` —
  `RoleScreens` requires a complete `Record<Role, ReactNode>` (or an explicit `fallback`), so a
  new role is a compile error on every dispatch page, and all pages branch identically (teaching
  the convention on day one).
- No `--roles` → single implicit role; `roles.ts` still exists with one entry so `role` can
  extend it later (never a structural rewrite).

## 7. `globals.css` — tokens (rendered from `--brand`)

Same structure as lucas_web's 332-line file — with one structural upgrade: **dark-ready,
light-enabled**. Tailwind v4 `@theme inline`; semantic shadcn slots; **`brand-50…950` ramp
computed by the CLI in OKLCH from the brand hex** (doc 04 §5) with `--primary` = brand-600;
status tones `success|warning|danger|info|neutral` each solid + `-subtle` +
`-subtle-foreground` + `-border`; `chart-1..5`; sidebar tokens; typography component classes
`text-display/h1/h2/h3/h4/body/body-lg/label/caption/overline/data/metric`; `--radius: 8px`.

Dark-readiness: every semantic slot is defined in `:root` **and** a complete
`:root[data-theme="dark"]` block (dark values derived from the same ramp) — but no theme toggle
ships and `data-theme` is never set, so v1 renders light-only. Components consume only semantic
slots (never raw ramp steps for surfaces), which is what makes dark mode a one-switch feature
later instead of a repaint. The `/design-system` page renders both palettes (dark behind a
dev-only preview toggle) and is kept in sync by hand thereafter.

## 8. i18n — `src/i18n/` (rendered from `--locales`)

The lucas_web pattern verbatim: `locales.ts` (SUPPORTED_LOCALES + native names),
`locale-store.ts` (persisted Zustand + `getLocale()`), `messages/<source>.ts` (full starter
catalog: auth, nav, common actions, validation keys, errors), `messages/<other>.ts` (`satisfies
Messages`, seeded with `TODO(<code>):`-prefixed copies), `index.ts` (`useTranslations()` typed
dot-path `MessageKey`, `useLocale`, `useSetLocale`). Hard rule IN-001 holds from file one — the
template contains **zero** hardcoded display strings.

## 9. AI config shipped inside the app (Flutter CLI parity)

- **`CLAUDE.md`** (`.eta`) — the lucas_web architecture guide, de-branded and rendered with the
  project's name/roles/locales/brand: stack table, role-first rule (role-default + `common/`
  carve-up + `_shared/` tier), data-flow chain, "where things go", backend contract, tokens,
  commands. This is the *single most copied file* — treat its prose as product.
- **`.claude/settings.json`** — sensible permissions for the stack (`npm run *`, `npx tsc`, lint).
- **README** points to `web-audit` / `jinn-web-quality` skills and the `doctor` command.

## 10. Verification harness (beyond Flutter parity)

- `e2e/sweep.spec.ts` — the Playwright walker from the `web-audit` live-sweep spec: route list →
  every page + dialog, pathological-string injection, `scrollWidth > clientWidth` assertions,
  per-role nav walk stub. Ships red-green from day one (`npm run sweep`).
- `vitest` unit seeds: envelope unwrap/refresh-on-401 tests for `backend-client`,
  `normalizePagination`, `roles` predicates. The transport is the most-tested code in the app.

## 11. `package.json` — pinned versions & scripts

Dependencies are **exact-pinned at template-build time** and bumped by CLI releases (the
template is CI-verified against them — doc 06 §3): `next@16.x react@19.x zod @tanstack/react-query
@tanstack/react-table nuqs zustand tailwindcss @radix-ui/* lucide-react sonner cmdk
react-hook-form @hookform/resolvers class-variance-authority clsx tailwind-merge`. Dev:
`typescript eslint + guardrail pack, @tanstack/eslint-plugin-query, eslint-plugin-jsx-a11y,
prettier, vitest, @playwright/test, @testing-library/react`.

Scripts: `dev build start lint typecheck (tsc --noEmit) test sweep (playwright) doctor
(jinn-web doctor) format`.

## 12. `eslint.config.mjs`

Imports `@codeable/eslint-config-web` (doc 06 §3) — import-boundary zones (role/sibling/shared
rules AR-002/003 generated to match the actual roles), restricted `fetch`/`console`/`process.env`/
hex, jsx-a11y, TanStack Query plugin, strict TS rules. The template must lint clean under its own
guardrails.

## 13. Acceptance checklist for the template (CI-enforced)

- [ ] `tsc --noEmit`, `eslint`, `next build` — zero issues
- [ ] `vitest` + Playwright smoke sweep pass
- [ ] Zero hardcoded display strings, hex values, raw `fetch`, inline query keys (guardrails prove it)
- [ ] `/web-audit` dry run: zero findings
- [ ] Every file ≤ 300 lines; every domain file follows AR-008 naming
