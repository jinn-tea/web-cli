# 05 — Generators: `domain`, `role`, `component`, `dialog`, `add-locale`, `rename`, removals

The daily-driver value. Benchmark (measured live): `codeable_cli feature orders --role admin`
emits 6 files **and edits 4 existing files** (cubit registration, router import, GoRoute,
route constants) in ~8ms, idempotently, with `remove-feature` as its true inverse. Every
generator here must meet that bar: **emit + wire + reversible + idempotent + leaves the project
compiling and `doctor`-clean.** All run through the plan/dry-run/rollback engine (doc 03 §6).

---

## 1. Naming rules (used by all generators — `engine/naming.ts`)

Input `orders`, role `admin`:

| Derived | Value |
|---|---|
| Domain dir | `src/features/admin/orders/` |
| Kebab | `orders` (files: `orders.repository.ts`, `use-orders.ts`, `orders.schema.ts`) |
| Pascal | `Orders` (types `Order`, screens `AdminOrdersScreen`) |
| Camel | `orders` (`QUERY_KEYS.orders`, `APP_ROUTES.orders`) |
| Route path | `/orders` (role does **not** prefix URLs — pages role-dispatch; matches lucas_web) |
| i18n namespace | `orders.*` |

Role `common` → no role flavor in class names (Flutter CLI parity: `common` is grouping only).
Multi-word input `vehicle-types` → `VehicleTypes` / `useVehicleTypes` / `vehicleTypes`.

## 2. `domain <name>` — the `feature` equivalent

```
jinn-web domain <name> [-r --role <role> | -R --pick-role] [--no-page] [--starter] [--dry-run]
```

- No `--role` and project has roles → `--pick-role` behavior via `askSelect` over
  `listRoles()` + `common` (Flutter CLI's `-R`). Single-role project → defaults to `common`.
- Domain exists → `Domain <name> already exists. Overwrite?` (default No).

**Emits (templates in `templates/domain/`, all AR-008-named):**

```
features/<role>/<name>/
├── api/<name>.repository.ts      # list/get/create/update/remove on backendClient; Zod-parsed
│                                 #   input; list forwards { signal }; paginated via normalizePagination
├── services/use-<name>.ts        # useList (keepPreviousData, QUERY_KEYS factory, signal, params
│                                 #   from useTableParams), useCreate/useUpdate/useDelete via
│                                 #   createMutationHelpers (invalidate + ApiError toast — lib/mutations)
├── validations/<name>.schema.ts  # createSchema/updateSchema; messages are i18n keys
├── types/index.ts                # <Name> entity + Create<Name>Input (z.infer)
├── constants.ts                  # <name>Endpoints — group-parameterized factory shape
└── components/
    ├── <name>-screen.tsx         # ~30 lines: PageHeader + SearchInput + <DataTable> (URL-synced
    │                             #   sort/page via useTableParams; skeleton/empty/error built in — 22.1)
    ├── <name>-columns.tsx        # TanStack column defs: TruncatedText cells, StatusBadge where apt,
    │                             #   RowActions column (edit/delete w/ ConfirmDialog)
    └── <name>-form-dialog.tsx    # FormDialog shell + RHF + zodResolver + FormActions (pending-disabled)
```

Stubs are **complete working CRUD against the conventional REST shape** (`GET/POST /x`,
`GET/PATCH/DELETE /x/:id`) — not comment skeletons. Wrong endpoint shape = edit two files
(`constants.ts`, repository), the pattern stays.

**Wires (codemods, each idempotent + reversible — doc 03 §5):**

1. `constants/routes.ts` — `APP_ROUTES.<camel> = "/<kebab>"`.
2. `constants/query-keys.ts` — `QUERY_KEYS.<camel>` factory (`all`, `list(params)`, `detail(id)`;
   group-scoped when the project has roles).
3. `src/app/(app)/<kebab>/page.tsx` — thin page: role dispatch if roles exist, else renders the
   screen (skipped with `--no-page`).
4. `components/layout/nav-config.ts` — `NAV_ITEMS` entry (`labelKey: "<name>.title"`, lucide
   icon placeholder, `roles: ["<role>"]` or `"all"` for common).
5. `src/api.ts` — `export * from "@/features/<role>/<name>/constants"` (keeps the endpoint-index
   invariant mechanical).
6. `i18n/messages/*.ts` — seeds `<name>.title`, `.empty`, `.emptyHint`, `.createTitle`,
   `.deleteConfirm` (+ `TODO(<loc>):` in non-source catalogs).

Success output mirrors the Flutter CLI's:

```
Domain admin/orders fully wired up:
  - Route:      APP_ROUTES.orders → /orders
  - Query keys: QUERY_KEYS.orders
  - Nav item:   orders.title (roles: admin)
  - api.ts:     endpoints indexed
Navigate: <Link href={APP_ROUTES.orders}>
```

`--starter` (used by `create`): same shape, screen renders `PageHeader` + `EmptyState` only.

## 3. `remove-domain <name> --role <role>`

Confirm (list what will be deleted + unwired), then: revert codemods 1–6 (each reports
changed/skipped), delete the domain dir and the `(app)` page, remove seeded i18n keys, verify
`tsc --noEmit`. Round-trip (`domain` → `remove-domain`) must restore every touched file
**byte-for-byte** (tested — doc 06 §4).

## 4. `role <name>` / `remove-role <name>` (no Flutter equivalent — our differentiator)

`role <name>`:
1. `appendToConstArray(ROLES, "<name>")` — the exhaustiveness guards now make `tsc` list every
   remaining decision site.
2. `ROLE_LABEL_KEYS` entry + i18n `roles.<name>` key in all catalogs.
3. `features/<name>/_shared/.gitkeep`.
4. Update `jinn-web.config.json`.
5. Run `tsc --noEmit`, **parse the errors, and print them as a checklist**:

```
Role "lager" added. The compiler found 3 places that need a decision:
  ☐ src/constants/roles.ts:41   ROLE_TO_GROUP missing "lager"
  ☐ src/app/(app)/dashboard/page.tsx:12  role dispatch missing case
  ☐ src/lib/permissions.ts:8    action table missing "lager"
Generate its first domain:  jinn-web domain <name> --role lager
```

That reframing — *compiler errors as the todo list* — is the entire point of the tuple+guard
architecture. `remove-role` reverses 1–4, refuses if `features/<name>/` still contains domains
(tells the user to `remove-domain` or migrate them first).

## 5. `component <name>` and `dialog <name>`

- `component <name> [--shared | --role <r> | --domain <r>/<d>]` — placement = the AR-002 tier
  ladder: `components/shared/` (domain-free, parameterized) · `features/<r>/_shared/components/`
  (role-shared) · `features/<r>/<d>/components/` (domain-local). No flag → `askSelect` showing
  the three tiers with one-line guidance. Emits a typed, `cn()`-styled, i18n-clean stub.
- `dialog <name> --domain <r>/<d> [-t confirm|form|custom]` — the `bottom-sheet` equivalent.
  `confirm` → thin wrapper over shared `ConfirmDialog`; `form` → RHF + zodResolver + FormActions
  wired to the domain's schema/mutation; `custom` → bare shadcn `Dialog` shell. Emits into the
  domain's `components/`, no wiring edits (matches Flutter CLI's bottom-sheet behavior).

## 6. `add-locale <code>`

Validate `^[a-z]{2}(-[A-Z]{2})?$`. Then: create `i18n/messages/<code>.ts` as a deep copy of the
source catalog with every leaf string prefixed `TODO(<code>): ` and `satisfies Messages`
appended; codemod `SUPPORTED_LOCALES` (+ native name from a built-in table, prompt if unknown);
update config. TS keeps the catalog complete forever after — this generator only seeds.
(Flutter parity: `[TODO: <locale>]` ARB cloning + gen-l10n.)

## 7. `rename`

`rename -n <new-name> [--display-only]`: package.json `name`, `APP_NAME` in `constants/`,
root-layout `metadata`, i18n brand keys, README heading; without `--display-only` also offers
directory rename. No import rewriting needed (the `@/*` alias is name-free — simpler than the
Flutter CLI's package-wide `package:old/` rewrite, by design).

## 8. Shared generator contract (restated as a checklist for every generator PR)

- [ ] Plan-based; `--dry-run` prints, writes nothing
- [ ] Idempotent (2nd run = no-ops + `skipped` notes, or overwrite-confirm)
- [ ] Reversible twin restores byte-identical state
- [ ] Project compiles (`tsc --noEmit`) after run — verified by the generator itself
- [ ] `doctor` clean after run
- [ ] All emitted strings i18n-keyed; all emitted files pass the guardrail ESLint pack
- [ ] Success summary printed in the Flutter CLI's "fully wired up" style
