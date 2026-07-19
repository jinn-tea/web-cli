# 04 — `create`: Scaffolding a Project

`codeable-web create` is the flagship command. End state: a directory that installs, compiles,
lints, builds, and passes `/web-audit` with zero findings — in one command, interactively or
fully non-interactive.

---

## 1. Signature

```
codeable-web create [name]
  -n, --name <name>         project name (kebab-case)          [positional or flag]
  -a, --app-name <name>     display name (e.g. "My App")
  -d, --description <text>  package.json description            (default: "A new Next.js app")
      --output <dir>        parent directory                    (default: ".")
      --roles <list>        comma list, e.g. admin,customer     (default: none → single-role)
      --locales <list>      comma list, first = source          (default: "en")
      --brand <hex>         brand color                         (default: "#2563EB")
      --api-url <url>       backend base URL                    (default: "http://localhost:3000/api")
      --auth <bff|client>   auth model (doc 02 §3a)             (default: "bff"; flag-only, never prompted)
      --pm <npm|pnpm|yarn|bun>  package manager                 (default: auto-detect, prefer pnpm)
      --no-install          skip dependency install
      --no-git              skip git init
      --dry-run             print the file plan only
```

## 2. Prompt flow (only for missing flags — Flutter CLI parity)

Exact prompt order and texts (via `@clack/prompts`; defaults shown in brackets):

1. `What is the project name?` [`my-app`] — validate `^[a-z][a-z0-9-]*$`; on failure re-prompt
   with the rule shown.
2. `What is the display name of your app?` [Title Case of project name]
3. `Which roles does this app have? (comma-separated, empty for single-role)` [``] — e.g.
   `admin, customer`; each validated `^[a-z][a-z0-9-]*$`; `common` rejected with "common is
   implicit".
4. `Which locales? (first is the source language)` [`en`]
5. `Brand color (hex)?` [`#2563EB`] — validate `^#[0-9a-fA-F]{6}$`.
6. `Backend API base URL?` [`http://localhost:3000/api`]

Description/output/pm/install/git are **flag-only, never prompted** (mirrors the Flutter CLI,
where description/output/roles are flag-only). Target dir exists and non-empty →
`Directory <name> already exists. Overwrite?` (default No; deletion goes through the plan).

## 3. Execution pipeline (each a spinner `step`, in order)

```
1  Validate inputs & resolve target path
2  Build BrandRamp from --brand                                   (§5, pure math)
3  renderTree(templates/app, vars)  → FileOp[] into staging       (doc 03 §4/§6)
4  Per role: run the domain generator for the starter domain      (§6 — real generator, not a
   special template, exactly like the Flutter CLI reuses FeatureGenerator for role onboarding)
5  Write codeable.config.json (+ record cliVersion)
6  git init + initial commit "chore: scaffold with codeable-web-cli vX"   (unless --no-git)
7  <pm> install                                                    (unless --no-install)
8  npx playwright install --with-deps chromium                     (best-effort; warn on failure)
9  Verify: tsc --noEmit && eslint (fail = CLI bug → rollback staging, exit 3 with report)
10 Atomic move staging → target
```

Step 9 is the discipline the Flutter CLI lacks: **create verifies its own output** before
handing it over. A red verify never ships a broken tree to the user.

## 4. Success output (Flutter CLI's summary style, exactly this shape)

```
Project my-app created successfully!

  Location:  ./my-app
  Roles:     admin, customer (+ common)
  Locales:   en (source), de
  Brand:     #2563EB

Next steps:
  cd my-app
  pnpm dev

Generate a domain:      codeable-web domain orders --role admin
Add a role later:       codeable-web role lager
Check project health:   codeable-web doctor
```

## 5. Brand ramp generation (`src/engine/brand.ts`)

Input one hex → output the `brand-50…950` ramp + semantic slot values rendered into
`globals.css.eta`. Algorithm (deterministic, `culori`):

1. Convert hex → OKLCH `{ l, c, h }`.
2. Fixed lightness ladder (tuned against Tailwind's own blue ramp so `#2563EB` reproduces
   lucas_web's palette within ~1 ΔE):
   `50:0.985, 100:0.955, 200:0.90, 300:0.83, 400:0.72, 500:0.62, 600:0.55, 700:0.47,
   800:0.40, 900:0.35, 950:0.26`.
3. Chroma scaled per stop: `c * clamp(sin(π · (1 - |stop.l - inputL|)), 0.15, 1)` — pale ends,
   full chroma near the input; hue held constant.
4. Snap the stop nearest the input color to the exact input hex (the brand must appear verbatim).
5. Emit as OKLCH strings (`oklch(0.55 0.19 262)`) — Tailwind v4 native.
6. Derived slots: `--primary: brand-600`, `--ring: brand-600`, `--accent: brand-50`,
   `--sidebar-accent: brand-100`, `chart-1..5` = 600/400/800/300/500.
Unit-tested with golden values for `#2563EB` (doc 06 §4).

## 6. Roles at create time

For each role in `--roles`: create `src/features/<role>/_shared/.gitkeep`, then invoke the
**domain generator** (doc 05) for a starter domain `dashboard` under that role with
`--starter` flavor: emits the standard file set where the repository/service are stubs over a
`/{role}/dashboard` endpoint and the screen renders `PageHeader` + `EmptyState` — wired into
routes, query keys, nav (visible to that role only), and i18n. `(app)/dashboard/page.tsx`
renders `<RoleScreens>` over these screens. Result: the multi-role skeleton is
**demonstrated, compiling, and navigable** on first `pnpm dev` — the exact experience the
Flutter CLI gives with per-role onboarding features.

No roles → `roles.ts` gets a single `"user"` entry, dashboard skips `<RoleScreens>` but keeps
the same file shape (so `role` can add dispatch later via codemod, not rewrite).

## 7. Failure modes (all explicitly handled)

| Failure | Behavior |
|---|---|
| Invalid name/hex/locale | exit 1 before any FS work, rule printed |
| Target exists, overwrite declined | exit 1, untouched |
| Install fails (network) | keep the tree, print "run `pnpm install` manually"; exit 0 with warning (tree is valid) |
| tsc/eslint verify fails | rollback staging entirely, exit 3, print report + "this is a CLI bug, please file it" |
| Ctrl-C mid-run | staging dir removed via signal handler |

## 8. Acceptance tests (doc 06 §4 hosts the harness)

- [ ] Non-interactive: `create -n t --roles admin,customer --locales en,de --brand "#10B981"
      --no-install --dry-run` prints a plan and writes nothing
- [ ] Full run (CI, with install): output passes `tsc`, `eslint`, `next build`, `vitest`, smoke sweep
- [ ] Golden snapshot of the rendered tree for the standard fixture matrix:
      `{no roles, 2 roles} × {1 locale, 2 locales}`
- [ ] `#2563EB` ramp golden test; overwrite-decline leaves an existing dir byte-identical
