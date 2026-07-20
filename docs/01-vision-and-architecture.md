# 01 — Vision & Architecture

> **jinn-web** — a Node/TypeScript CLI that scaffolds production-ready Next.js (App Router)
> apps with the Codeable web architecture: role-first features, external-backend repository
> pattern, TanStack React Query, Zustand, Zod, Tailwind v4 tokens, shadcn/ui, typed i18n — and
> then keeps generating and validating code inside them for the project's whole life.

This is the web equivalent of `codeable_cli` (the Codeable Flutter CLI, pub.dev `codeable_cli`,
currently v1.0.41) — **matched command-for-command, and deliberately better where the Flutter CLI
is weak**. Every claim in these docs about the Flutter CLI comes from reading its published source
(`~/.pub-cache/hosted/pub.dev/codeable_cli-1.0.41/`) and from running it live (`create`, `feature`,
`doctor` were all exercised against a temp project).

---

## 1. Why this exists

Holos is the gold-standard Flutter app because the Flutter CLI made the right architecture the
path of least resistance from commit one: `DataState`, `execute()`, core widgets, wired routing,
l10n, flavors — all present before the first feature was written. The audits (`flutter-audit`)
then only had to keep projects on the rails.

The web side has the rails **documented** (lucas_web's CLAUDE.md, the `web-audit` and
`jinn-web-quality` skills) but nothing that **lays** them. Every new web project starts from
`create-next-app` and gets manually dragged toward the convention. This CLI closes that loop:

```
jinn-web create  ──►  a repo that already passes /web-audit with zero findings
jinn-web domain  ──►  a feature that already follows all 44 jinn-web-quality rules
jinn-web doctor  ──►  proof it stayed that way
```

## 2. Product definition

- **Package name (npm):** `jinn-web`
- **Binary:** `jinn-web` (also runnable as `npx jinn-web <cmd>`)
- **Runtime:** Node ≥ 20, ESM-only, TypeScript compiled with `tsup`
- **Scaffolds:** Next.js 16 App Router · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui ·
  TanStack Query v5 · Zustand v5 · Zod v4 · typed i18n (no lib, the lucas_web pattern) ·
  Playwright (sweep harness) · Vitest
- **Roles are optional.** `create --no-roles` produces a genuinely roleless app —
  no `Role` type, no guards, features flat under `features/<domain>/`. Roles can be
  added later; `role <name>` migrates the project rather than making the choice
  permanent. See doc 02 §6.
- **Targets:** the app is a *client of an external backend*. Default auth is **BFF-lite**
  (httpOnly refresh cookie via a thin `/api/session` route handler, access token in memory —
  works against existing bearer backends unchanged and enables middleware gating + server
  prefetch; doc 02 §3a). `create --auth client` opts into the pure-client bearer model for
  mobile-contract-parity projects. A full internal-API variant is **out of scope for v1**.

## 3. Command surface — parity matrix

Every Flutter CLI command mapped to its web equivalent. Names, flags and prompt behavior are
specified exactly in docs 04–06.

| Flutter CLI (`codeable_cli`)   | Web CLI (`jinn-web`)          | Notes |
|---|---|---|
| `create` (`-n -o -a -d --output --roles`) | `create` (`-n -a -d --output --roles --no-roles --locales --brand --api-url --pm`) | No `--org` (no bundle ids on web); adds locales, brand hex, backend URL, package manager. |
| `feature <name> --role/--pick-role` | `domain <name> --role/--pick-role` | "Domain" matches web vocabulary (`features/<role>/<domain>`). |
| `remove-feature`               | `remove-domain`                   | Full reverse incl. unwiring. |
| `bottom-sheet <name> -f -t`    | `dialog <name> --domain -t`       | Types: `confirm \| form \| custom` (web has dialogs/sheets via shadcn). |
| —                              | `component <name> --shared\|--role <r>\|--domain <d>` | New: places a component at the right tier (§AR-002 three-tier rule). |
| `rename`                       | `rename`                          | package.json name + APP_NAME + metadata + i18n brand keys. |
| `change-app-name`              | *(folded into `rename --display-only`)* | Web has one display name (constants + `metadata` + PWA manifest), no per-platform surgery. |
| `change-id`                    | —                                 | N/A on web (no bundle identifier). |
| `add-locale -l`                | `add-locale <code>`               | Clones source catalog with `TODO(<code>):` markers; TS enforces completion. |
| —                              | `role <name>` / `remove-role`     | New: adds a role end-to-end (ROLES tuple → folders → nav → guards). The exhaustiveness guards make the compiler list every remaining decision. |
| `doctor`                       | `doctor` (+ `doctor --fix`)       | 9 static wiring checks (doc 06); `--fix` auto-repairs the mechanical ones. |
| —                              | `guardrails`                      | New: installs the ESLint rule-pack into *existing* repos (lucas_web adoption path). |
| `update`                       | `update`                          | Self-update check via npm registry (`update-notifier` + explicit command). |
| `sample`                       | —                                 | Dead demo command in the Flutter CLI; not carried over. |

## 4. What we copy from the Flutter CLI (its proven strengths)

These were verified in source and live runs — they are contracts, not aspirations:

1. **Flag-first, prompt-fallback UX.** Every value is a flag; interactive prompts appear only for
   missing values. This makes the CLI equally usable by a human, a CI job, and a Claude agent.
   (Flutter CLI: `create` prompts exactly 3 questions when flags are missing; description/roles
   are flag-only.)
2. **Generators that WIRE, not just emit.** `codeable_cli feature` emits 6 files *and edits 4
   existing files* (cubit registration in `app_page.dart`, screen import in `go_router/exports.dart`,
   `GoRoute` at the `// TODO: Add more routes here` anchor, constants in `AppRoutes`/`AppRouteNames`)
   — all idempotent via `contains` guards. The web `domain` generator must do the equivalent
   (doc 05 §4) or it's a toy.
3. **Reversible generators.** `remove-feature` is a true inverse of `feature`. `remove-domain` and
   `remove-role` must be true inverses too.
4. **`doctor`.** The Flutter CLI's 5 static health checks (cubit registration, route wiring,
   route-constant parity, dangling barrel imports, ARB key parity) are its killer feature. The web
   doctor runs 9 (doc 06).
5. **Ships its own AI config.** The Flutter CLI writes `CLAUDE.md`, `.cursorrules`,
   `.claude/settings.json`, and a bundled audit skill into every generated app. We ship the
   web equivalents: the CLAUDE.md template (doc 02 §9), `.claude/settings.json`, and pointers to
   `web-audit`/`jinn-web-quality`.
6. **Role-aware from the scaffold.** `create --roles admin,customer` creates role folders each with
   a fully-wired starter feature. Web `create --roles` does the same (doc 04 §6).

## 5. Where we deliberately beat it (its measured weaknesses)

Each of these is a confirmed weakness in the Flutter CLI source, with the web-side fix:

| Flutter CLI weakness | Web CLI decision |
|---|---|
| Templates are 26 files of giant inline Dart string constants (`const xTemplate = '''…'''`) — unlintable, unhighlightable, untestable. | **Real template files** bundled in the package under `templates/`, rendered with **Eta** (EJS-style `<%= it.x %>` delimiters — chosen because Handlebars-style `{{ }}` collides with JSX `style={{…}}`). Templates are type-checked in CI by rendering the full tree and running `tsc` on the output (doc 06 §3). |
| All edits to existing files are `replaceAll`/regex surgery on hardcoded anchor strings — breaks silently if the user reformatted the file. | **AST codemods with `ts-morph`** for every edit to an existing TS/TSX file, plus **registry-driven wiring**: the generated app concentrates wiring into plain data structures (`ROUTES`, `QUERY_KEYS`, `NAV_ITEMS`, `src/api.ts`) that are trivially and safely appendable as AST array/object members (doc 03 §5). Comment anchors exist only as a *fallback* locator, never the primary mechanism. |
| Naive `{{key}}` `replaceAll` with no escaping — value containing `{{…}}` corrupts output. | Real template engine with proper escaping and a typed variable model (`TemplateVars` interface — a missing variable is a compile error in the CLI, not a `{{key}}` leaked into the app). |
| No dry-run; destructive mid-failure leaves a half-scaffolded dir. | **Transactional FS layer**: every command builds a `FileOp[]` plan first; `--dry-run` prints the plan; execution writes to a staging dir and commits atomically (create) or snapshots-then-rolls-back touched files on failure (generators). Doc 03 §6. |
| Generators/template engine/wiring are untested (only 4 trivial tests exist). | **Golden-tree snapshot tests + wiring round-trip tests + compile-the-output CI** (doc 06 §4). The risky code is the *most* tested code. |
| Fixed theme/fonts/colors — no brand input. | `create --brand <hex>` generates the full `brand-50…950` OKLCH ramp + semantic tokens into `globals.css` (doc 04 §5). |

## 6. CLI repository layout

Mirrors the Flutter CLI's shape (so your muscle memory transfers) with the improvements above:

```
jinn-web/
├── bin/
│   └── jinn-web.js            # #!/usr/bin/env node → dist/cli.js
├── src/
│   ├── cli.ts                     # commander program: registers all commands, --version, update nag
│   ├── commands/                  # one file per command + index.ts barrel
│   │   ├── create.ts  domain.ts  remove-domain.ts  role.ts  remove-role.ts
│   │   ├── component.ts  dialog.ts  add-locale.ts  rename.ts
│   │   ├── doctor.ts  guardrails.ts  update.ts
│   ├── generators/                # the engines (commands stay thin)
│   │   ├── project-generator.ts   # create: template render + copy + post-steps
│   │   ├── domain-generator.ts    # domain emit + wiring codemods (+ reverse)
│   │   ├── role-generator.ts      # role add/remove codemods
│   │   ├── component-generator.ts
│   │   └── locale-generator.ts
│   ├── engine/
│   │   ├── template.ts            # Eta wrapper, TemplateVars types, case helpers
│   │   ├── codemods.ts            # ts-morph helpers: appendToConstArray, addObjectMember,
│   │   │                          #   addNamedExport, addImport, removeMember — all idempotent
│   │   ├── fs-plan.ts             # FileOp plan, dry-run printer, transactional commit/rollback
│   │   ├── project.ts             # detectProject(), readProjectConfig(), roles/domains discovery
│   │   └── naming.ts              # toKebab/toPascal/toCamel/toTitle + validators
│   ├── doctor/
│   │   └── checks/                # one file per doctor check (doc 06 §2)
│   └── version.ts                 # stamped at build
├── templates/
│   ├── app/                       # THE GOLDEN TEMPLATE (doc 02) — full Next.js tree;
│   │   │                          #   tokenized files end in `.eta`, everything else copied verbatim
│   ├── domain/                    # domain generator templates (doc 05 §2)
│   ├── role/  component/  dialog/
├── assets/                        # binary/verbatim assets (favicon set, placeholder logo svg, fonts note)
├── test/
│   ├── golden/                    # snapshot trees per scenario
│   ├── create.test.ts  domain.test.ts  wiring-roundtrip.test.ts  doctor.test.ts
├── package.json  tsconfig.json  tsup.config.ts  eslint.config.mjs  vitest.config.ts
├── CHANGELOG.md  README.md  CLAUDE.md
└── .github/workflows/ci.yml       # doc 06 §5
```

## 7. Runtime dependency policy

The Flutter CLI keeps runtime deps to 4 (`args`, `cli_completion`, `mason_logger`, `pub_updater`).
Match that discipline — every dep must earn its place:

| Concern | Dependency | Flutter CLI analog |
|---|---|---|
| Command framework | `commander` | `args` (CommandRunner) |
| Prompts/spinners/colored output | `@clack/prompts` (+ `picocolors`) | `mason_logger` |
| Template engine | `eta` | hand-rolled `TemplateEngine` (improved) |
| AST codemods | `ts-morph` | regex surgery (improved) |
| Brand ramp math | `culori` (OKLCH) | — (new capability) |
| Update check | `update-notifier` | `pub_updater` |
| FS niceties | `fs-extra` | `dart:io` |

Nothing else at runtime. `execa` allowed for spawning `npm/pnpm install`, `git init`,
`npx shadcn`. Dev deps: `typescript`, `tsup`, `vitest`, `eslint`, `@types/node`.

## 8. Execution model (every command follows this)

```
parse flags ─► fill gaps with @clack prompts ─► validate (naming.ts)
  ─► detectProject() guard (generators require a jinn-web project; create requires empty/confirmed dir)
  ─► build FileOp[] plan (pure — no disk writes)
  ─► --dry-run? print plan and exit
  ─► execute plan transactionally (spinner per step, mason-logger-style)
  ─► post steps (install / codemod / format via the project's prettier)
  ─► print "next steps" block (exact copy style of the Flutter CLI's summary)
```

A generated project is identified by a `jinn-web.config.json` at its root (written by `create`):

```jsonc
{
  "$schema": "https://unpkg.com/jinn-web/schema/codeable.config.schema.json",
  "cliVersion": "1.0.0",
  "roles": ["admin", "customer"],        // + "common" implied
  "locales": ["en", "de"],               // first entry = source catalog
  "brand": "#2563EB",
  "packageManager": "pnpm"
}
```

Generators and `doctor` read this instead of guessing — the Flutter CLI has no equivalent and
must re-discover state from the filesystem every run; this file removes a whole class of ambiguity.

## 9. Definition of done for v1.0.0

1. `create` produces an app where `tsc --noEmit`, `eslint`, `next build`, `vitest`, and the
   Playwright smoke sweep all pass with **zero** issues, and a `/web-audit` run reports **zero**
   findings.
2. `domain`/`role`/`add-locale`/`component`/`dialog` each leave the project compiling and
   `doctor`-clean, and each `remove-*` restores the pre-generation state byte-for-byte (verified
   by round-trip tests).
3. `doctor` catches every seeded breakage in the test fixtures (doc 06 §4.3).
4. Published to npm; `npx jinn-web create` works on a clean machine with only Node 20.

## 10. Reading order

- **02** — the golden template (what `create` emits; the largest and most important spec)
- **03** — CLI skeleton, template engine, codemods, transactional FS
- **04** — `create` end-to-end
- **05** — generators (`domain`, `role`, `component`, `dialog`, `add-locale`, `rename`, removals)
- **06** — `doctor`, the ESLint guardrail pack, and the test strategy
- **07** — distribution, versioning, skills integration, roadmap
