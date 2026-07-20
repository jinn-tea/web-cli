# 06 — `doctor`, the ESLint Guardrail Pack & Test Strategy

Three legs of the same stool: `doctor` proves the wiring stayed intact, the guardrail pack makes
the quality rules mechanical, and the test strategy keeps the CLI itself trustworthy (the
Flutter CLI's weakest point — its generators are effectively untested).

---

## 1. `doctor` — design

Flutter benchmark (run live): 5 checks — cubit registration, route wiring, route-constant
parity, dangling barrel imports, ARB key parity — ✓/✗ output, non-zero exit on issues. Web
`doctor` runs **9 checks**, each a self-contained module in `src/doctor/checks/` with the
interface:

```ts
interface DoctorCheck {
  id: string;             // "routes", "query-keys", …
  title: string;
  run(project: Project): Issue[];       // ts-morph Project, read-only
  fix?(project: Project, issue: Issue): void;   // only mechanical fixes
}
interface Issue { file: string; line?: number; message: string; fixable: boolean }
```

`jinn-web doctor` prints grouped ✓/✗ per check (exit 2 if any issue);
`doctor --fix` applies every `fixable` issue through the plan engine and re-runs.

## 2. The 10 checks (exact semantics)

| # | id | What it verifies | Fixable? |
|---|---|---|---|
| 1 | `routes` | Every `src/app/(app)/**/page.tsx` path has a matching `APP_ROUTES` entry, and every `APP_ROUTES` value has a page. No hardcoded path literals in `<Link href>`/`router.push` (string args not referencing `ROUTES`). | add missing constant ✓ / dead constant ✗ (report) |
| 2 | `query-keys` | No inline `queryKey: [...]` arrays in `features/**` (must reference `QUERY_KEYS`); every `QUERY_KEYS` factory is referenced somewhere (dead-key report). | ✗ (report with file:line) |
| 3 | `nav` | Every `NAV_ITEMS.href` exists in `APP_ROUTES`; every `labelKey` exists in the source catalog; `roles` values ⊆ `ROLES`. | dangling label key → seed TODO entry ✓ |
| 4 | `api-index` | Every `features/*/*/constants.ts` exporting endpoints is re-exported from `src/api.ts` ("an index that's only mostly complete stops being trusted"). | add missing export ✓ |
| 5 | `i18n` | Key-set parity source vs other catalogs (belt to TS's braces); orphaned keys (defined, never referenced via `t("…")` incl. dynamic-prefix allowlist); leftover `TODO(<loc>):` values (warning, not error). | remove orphans ✓ (with confirm) |
| 6 | `boundaries` | Import-graph scan: role→role imports, sibling-domain imports, shared-layer→features imports (AR-002/003 — belt to the ESLint zones, catches files the linter hasn't seen). | ✗ |
| 7 | `roles` | `jinn-web.config.json` roles ⊆ `src/features/*` dirs and vice versa; every role present in `ROLE_LABEL_KEYS` and the i18n `roles.*` namespace. | sync config ✓ |
| 8 | `naming` | Every domain follows AR-008 (`use-<domain>.ts`, `<domain>.repository.ts`, `<domain>.schema.ts` present under standard subfolders); flags drift. | ✗ |
| 9 | `deps` | `jinn-web.config.json.cliVersion` vs installed CLI (nag if template conventions moved); duplicate-purpose packages (two toast libs, two date libs) from a small denylist. | ✗ |
| 10 | `response-parsing` | Every `backendClient.get/post/put/patch` in `features/**/api/*.repository.ts` passes `{ parse }`. `delete` is exempt (empty envelope). Comments and string bodies are blanked before scanning — the repository's own doc comment quotes the anti-pattern it warns about, and an earlier version reported that documentation as a violation. | ✗ — the schema can't be inferred |

Output style (Flutter parity):

```
Running doctor checks for my-app…

Routes            ✓ 12 pages ↔ 12 constants
Query keys        ✗ 1 inline queryKey — src/features/admin/orders/services/use-orders.ts:31
…
8 checks passed, 1 issue found (1 fixable → run jinn-web doctor --fix)
```

## 3. The ESLint guardrail pack — `@codeable/eslint-config-web`

A **separate npm package** in the same monorepo (or repo sibling), consumed by the template and
adoptable by existing repos via `jinn-web guardrails`. Flat-config ESM export:

```js
export default function codeableWeb({ roles = [] } = {}) { return [ /* config objects */ ] }
```

Layers (each maps to `jinn-web-quality` rule ids):

1. **Import boundaries (AR-002/003)** — `no-restricted-imports` zones *generated from `roles`*:
   role↛role, `features/common`↛`features/<role>`, `lib|components|types|constants|hooks`↛
   `@/features/*`, plus `patterns: ["../*"]` (CQ-002). `guardrails` re-renders this layer when
   roles change (and `role` command triggers it).
2. **Transport (DS-002)** — `fetch` banned outside `src/lib/http/**` via per-directory overrides.
3. **Console/alerts (CC-006/002)** — `no-console` (allow `warn`,`error` in `lib/`), `no-alert`.
4. **Env & hex (§15/ST-001)** — `no-restricted-syntax` selectors: `process.env` member reads
   outside `config/env.ts`; hex-color string literals in `.tsx`.
5. **Types (TV-003)** — `@typescript-eslint/no-explicit-any`, `no-non-null-assertion`.
6. **Query (DS-004/005)** — `@tanstack/eslint-plugin-query` recommended.
7. **a11y** — `eslint-plugin-jsx-a11y` recommended.

`jinn-web guardrails` (for existing repos like lucas_web): detect roles (ask if
undetectable), install the package, write/merge `eslint.config.mjs`, run `eslint --format
summary` and report the violation count *without failing* — adoption is a ratchet: `--level
error|warn` chooses severity so a legacy repo can start at `warn`.

## 4. Testing the CLI (the anti-Flutter-CLI investment)

Framework: Vitest. Fixtures render into `os.tmpdir()`. Three tiers:

**4.1 Unit** — naming validators/case helpers; brand-ramp golden (`#2563EB` → exact OKLCH
strings); every codemod helper: *idempotence* (apply×2 ≡ apply×1), *reversibility*
(apply→revert ≡ byte-identical), *format preservation* (prettier-stable).

**4.2 Golden trees** — `create --dry-run` plan snapshots + rendered-tree snapshots for the
fixture matrix `{no roles, 2 roles} × {1 locale, 2 locales}`; `domain`/`role`/`add-locale`
snapshot the *diff* (files added + codemod patches). Snapshot review = template review.

**4.3 Integration (the ones that catch real bugs)**
- **Compile-the-output**: full `create` (with install, cached) → `tsc --noEmit`, `eslint`,
  `next build`, `vitest`, Playwright smoke sweep — all green.
- **Wiring round-trips**: `domain` → `remove-domain` and `role` → `remove-role` restore
  byte-identical trees (hash the tree before/after).
- **Doctor seeded-breakage matrix**: programmatically break each of the 9 invariants in a fixture
  (delete a route constant, inline a query key, orphan an i18n key, cross-import roles…) and
  assert doctor flags exactly that check; then `--fix` where fixable and assert green.
- **Rollback**: inject a failing FileOp mid-plan; assert byte-identical restore.
- **Idempotence at command level**: running `domain orders --role admin` twice = overwrite
  prompt, not duplicate wiring.

## 5. CI (`.github/workflows/ci.yml`)

```
jobs:
  quality:   lint + typecheck + unit/golden tests            (node 20, 22)
  template:  create fixture matrix → compile-the-output suite (cache pnpm store + next cache)
  doctor:    seeded-breakage matrix
  migration: roleless → role-first, happy path AND rollback
  release:   on tag — build, npm publish --provenance (doc 07)
```

Template compile job runs on every PR touching `templates/**` — **the template can never rot**
(the `test_app`-in-CI idea, made mandatory). Budget ~6–8 min with caching.

## 6. Acceptance checklist

- [ ] doctor catches all 9 seeded breakages; `--fix` repairs the 4 fixable classes
- [ ] guardrail pack installs standalone into lucas_web and reports (not fails) at `warn`
- [ ] round-trip + rollback tests byte-identical; golden matrix committed
- [ ] CI green on Node 20 and 22
