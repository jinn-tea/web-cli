# 03 — CLI Skeleton & Engine

The plumbing every command runs on: project setup, the command runner, prompts, the template
engine, the codemod layer, and the transactional filesystem. Build this **before** any command —
`create` and the generators are thin once the engine exists (the Flutter CLI proves the ratio:
its engine `project_generator.dart` is 1381 lines; its command files are tiny).

---

## 1. Project bootstrap (exact steps)

```bash
mkdir codeable-web-cli && cd codeable-web-cli
git init
npm init -y
npm i commander @clack/prompts picocolors eta ts-morph culori fs-extra execa update-notifier
npm i -D typescript tsup vitest @types/node @types/fs-extra eslint prettier
npx tsc --init   # then apply tsconfig below
```

**package.json essentials:**

```jsonc
{
  "name": "codeable-web-cli",
  "version": "0.1.0",
  "type": "module",
  "bin": { "codeable-web": "./bin/codeable-web.js" },
  "files": ["bin", "dist", "templates", "assets", "schema"],
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm test"
  }
}
```

- `bin/codeable-web.js`: `#!/usr/bin/env node` + `import("../dist/cli.js")`.
- `tsup.config.ts`: entry `src/cli.ts`, format `esm`, target `node20`, `clean: true`, and a
  `define` injecting the package version into `src/version.ts` (the `build_version` equivalent).
- `tsconfig`: `strict`, `module: NodeNext`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.
- **Critical:** `templates/` and `assets/` ship in the npm package via `files` — resolve them at
  runtime with `new URL("../templates/", import.meta.url)` (the Node equivalent of the Flutter
  CLI's `Isolate.resolvePackageUri` trick).

## 2. Command runner — `src/cli.ts`

```ts
import { Command } from "commander";
import { version } from "./version.js";

const program = new Command("codeable-web")
  .description("Scaffold and grow production-ready Next.js apps with the Codeable architecture.")
  .version(version)
  .option("--verbose", "noisy logging including all shell commands")
  .option("--dry-run", "print the file plan without writing anything");

// registerCreate(program); registerDomain(program); … one register fn per command file
program.parseAsync();
```

Rules (Flutter CLI parity):
- Every command file exports `registerX(program)` and stays **thin** — parse/prompt/validate,
  then delegate to a generator.
- On startup (non-blocking) run `update-notifier`; after any command, if an update exists print
  the one-line nag (the Flutter CLI does exactly this via `pub_updater`).
- Exit codes: `0` ok · `1` validation/user error · `2` doctor found issues · `3` internal error
  (after rollback).

## 3. Prompts — `@clack/prompts` conventions

Flag-first, prompt-fallback (doc 01 §4.1). Standard helpers in `src/engine/prompts.ts`:

- `askText(flagValue, { message, defaultValue, validate })` — returns flag if present, else
  prompts. `p.isCancel` → exit 1 with "Cancelled.".
- `askConfirm`, `askSelect` (for `--pick-role`-style choices), `askMultiselect` (locales).
- Spinner wrapper `step(label, fn)` — prints `✓ label (123ms)` on success, `✗ label` + error on
  failure (mason_logger look). All command output goes through this module; no stray
  `console.log` elsewhere (mirrors the CLI's own quality rules).

## 4. Template engine — `src/engine/template.ts`

**Decision: Eta with EJS-style delimiters** (`<%= it.x %>`, `<% if %>`). Rationale: mustache-style
`{{ }}` collides with JSX (`style={{…}}`), which is exactly the corruption class the Flutter
CLI's naive `replaceAll('{{key}}')` invites; Eta is tiny, fast, typed, ESM.

- Templates are **real files** under `templates/`; tokenized ones end in `.eta`
  (`auth.repository.ts.eta` → renders to `auth.repository.ts`); everything else copies verbatim.
- **Typed variables**: each template group has an interface —

  ```ts
  export interface AppTemplateVars {
    projectName: string;        // kebab: "my-app"
    appName: string;            // display: "My App"
    description: string;
    roles: readonly string[];   // ["admin","customer"] (never includes "common")
    locales: readonly string[]; // first = source
    brand: BrandRamp;           // { hex, ramp: Record<50|100|…|950, string> } — doc 04 §5
    apiUrl: string;
    cliVersion: string;
  }
  ```

  `renderTree(dir, vars)` walks a template dir, renders `.eta` files with `vars`, copies the
  rest, and returns `FileOp[]` (never writes directly). A template referencing a variable not in
  the interface fails CI (templates are rendered + type-checked there — doc 06 §3).
- Case helpers in `src/engine/naming.ts`: `toKebab`, `toPascal`, `toCamel`, `toTitle`, plus
  validators `isValidProjectName` (`^[a-z][a-z0-9-]*$` — kebab, the npm/web convention, vs the
  Flutter CLI's snake) and `isValidLocale` (`^[a-z]{2}(-[A-Z]{2})?$`).

## 5. Codemods — `src/engine/codemods.ts` (the anchor-surgery replacement)

The Flutter CLI edits existing files with regex + string anchors; we use **ts-morph** against
**registry-shaped wiring points** deliberately designed into the template (doc 02): plain
exported `as const` arrays/objects that are trivially appendable as AST nodes.

Wiring points and their codemod helpers:

| Wiring point (in generated app) | Helper | Used by |
|---|---|---|
| `constants/roles.ts` → `ROLES = […] as const` | `appendToConstArray(file, "ROLES", `"lager"`)` | `role` |
| `constants/routes.ts` → `APP_ROUTES` object | `addObjectMember(file, "APP_ROUTES", "orders", `"/orders"`)` | `domain` |
| `constants/query-keys.ts` → `QUERY_KEYS` object | `addObjectMember(..)` with factory snippet | `domain` |
| `components/layout/nav-config.ts` → `NAV_ITEMS` array | `appendToConstArray(..)` with `NavItem` object text | `domain` |
| `src/api.ts` → re-export lines | `addNamedExport(file, "@/features/common/orders/constants")` | `domain` |
| `i18n/messages/<loc>.ts` → nested object | `addObjectMember(..)` per key path | `domain`, `add-locale` |
| `constants/roles.ts` → `ROLE_LABEL_KEYS` record | `addObjectMember(..)` | `role` |

Contract for every helper:
1. **Idempotent** — if the member/element already exists (matched by name/text), no-op and report
   `skipped` (the Flutter CLI's `contains` guard, done structurally).
2. **Reversible** — each helper has a `remove*` twin returning whether it changed anything
   (powers `remove-domain`/`remove-role`).
3. **Format-preserving** — after ts-morph saves, run the *project's own* Prettier on touched
   files so diffs stay minimal.
4. **Failure = actionable** — if a wiring point can't be found (user restructured the file),
   print exactly what to add by hand and where, and continue with a warning; never corrupt.
   (Comment anchors like `// codeable-web:routes` exist in the template as *fallback locators*
   only.)

JSON edits (`codeable.config.json`, `package.json`) go through parse → modify → stringify with
2-space indent — never string surgery.

## 6. Transactional FS — `src/engine/fs-plan.ts` (the Flutter CLI has nothing like this)

Every command produces a plan before touching disk:

```ts
type FileOp =
  | { kind: "write";  path: string; content: string | Buffer }
  | { kind: "copy";   from: string; to: string }
  | { kind: "mkdir";  path: string }
  | { kind: "delete"; path: string }
  | { kind: "codemod"; path: string; description: string; apply: () => void; revert: () => void };
```

- `--dry-run` prints the plan grouped by kind (`+ write src/features/... · ~ codemod
  constants/routes.ts — add APP_ROUTES.orders`) and exits 0.
- **`create` commit**: render everything into `<target>.codeable-staging/`, then atomic rename
  to `<target>`; any failure deletes staging — no half-scaffolded dirs.
- **Generator commit**: snapshot every to-be-touched file into a temp dir; on any op failure,
  restore all snapshots and delete created files; exit 3. On success, delete snapshots.
- Deletion safety: `delete` ops require the path to be inside the detected project root and are
  always listed in dry-run; `remove-*` commands print the plan and require `askConfirm` (or
  `--yes`).

## 7. Project detection — `src/engine/project.ts`

- `detectProject(cwd)`: walk up to find `codeable.config.json`; error with a helpful message if a
  generator runs outside one ("Run inside a codeable-web project, or scaffold one with
  `codeable-web create`."). `create` conversely refuses to run *inside* one.
- `readConfig()/writeConfig()` — typed accessors; every generator that changes project shape
  (roles, locales) updates the config in the same transaction.
- Discovery helpers used by prompts and doctor: `listRoles()` (config ∪ `src/features/*` dirs),
  `listDomains(role)`, `listLocales()`.

## 8. Engine acceptance checklist

- [ ] `renderTree` on `templates/app` with fixture vars produces a tree that `tsc`-compiles (CI)
- [ ] Every codemod helper: idempotence test (apply twice = apply once) + reversibility test
      (apply → revert = byte-identical file)
- [ ] Kill-switch test: inject a failing op mid-plan → project restored byte-for-byte
- [ ] `--dry-run` writes nothing (asserted with an FS watcher in tests)
