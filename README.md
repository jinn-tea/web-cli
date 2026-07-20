<h1 align="center">jinn-web</h1>

<p align="center">
  Scaffold and grow production-ready <strong>Next.js</strong> apps —
  role-first architecture, cookie auth, typed i18n, and generators that
  <em>wire</em> what they create.
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#commands">Commands</a> ·
  <a href="#what-you-get">What you get</a> ·
  <a href="#the-architecture">Architecture</a>
</p>

---

## Overview

`jinn-web` creates a Next.js 16 project that already has the parts every real
app grows anyway — authentication, roles, localization, a data table, forms,
error and empty states — wired together and passing its own type checks, lint,
tests and build on the first run.

It doesn't stop at `create`. Generators add domains, roles and languages for the
life of the project, and each one **edits the shared registries too** — routes,
query keys, navigation, the endpoint index, every locale catalog — so what it
generates is reachable immediately, not just present on disk.

It's the web counterpart to the Codeable Flutter CLI, built on the same idea:
make the right architecture the path of least resistance from the first commit.

> **Personal project.** The conventions it generates are Codeable's; the tool is
> mine and isn't an official Codeable product.

## Table of contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Commands](#commands)
- [What you get](#what-you-get)
- [The architecture](#the-architecture)
- [Adopting in an existing project](#adopting-in-an-existing-project)
- [Verifying your project](#verifying-your-project)
- [Contributing](#contributing)

## Prerequisites

- **Node.js 22.12 or newer** (`commander` and `execa` require it)
- npm, pnpm, yarn or bun
- A backend to talk to — the generated app is a *client*, not its own API

## Installation

Not on npm yet. Install from the repository:

```bash
npm install -g github:jinn-tea/web-cli
jinn-web --version
```

Or run a single command without installing:

```bash
npx github:jinn-tea/web-cli create my-app
```

## Quick start

```bash
jinn-web create acme --roles admin,lager --locales en,de --brand "#E11D48"
cd acme
npm run dev
```

**No roles?** Plenty of apps have one audience. Pass `--no-roles` and features
live flat under `src/features/<domain>/` with no `Role` type, no guards and no
role segment anywhere:

```bash
jinn-web create blog --no-roles
jinn-web domain posts            # no --role needed
```

Not a one-way door: `jinn-web role admin` later converts the project — it moves
existing features under `features/common/`, repoints their imports, restores the
role-shaped files, and reports the handful of call sites the compiler now wants
updated.

Anything you don't pass as a flag is prompted for; in CI or a non-interactive
shell every prompt takes its default instead of hanging.

You get a running app with sign-in, a role-aware dashboard, settings, a
design-system reference page, and a green `npm run verify`.

### Add a domain

```bash
jinn-web domain shipments --role lager
```

Ten files — model, repository, hooks, Zod schema, types, endpoints, list screen,
columns, form dialog, page — plus six wiring edits. Visit `/shipments` and
there's a working paginated, searchable table with loading, empty and error
states already handled.

### Add a role

```bash
jinn-web role finance
```

It extends `ROLES` and every map keyed off it, creates the role's folders and
dashboard, regenerates the dispatch page — then runs `tsc` and hands back
**everything the compiler now demands a decision about**:

```
☐ src/lib/permissions.ts:4
   Property 'finance' is missing in type '{ admin: true; lager: false; }'
   but required in type 'Record<"admin" | "lager" | "finance", boolean>'.
```

That's the point of the exhaustive `Record<Role, …>` maps: adding a role hands
you the todo list instead of relying on you to remember.

### Check it still hangs together

```bash
jinn-web doctor
```

## Commands

| Command | What it does |
|---|---|
| [`create`](#create) | Scaffold a new project |
| [`domain`](#domain) | A full CRUD domain, wired end to end |
| [`remove-domain`](#remove-domain) | The exact inverse of `domain` |
| [`role`](#role) | Add a role, then report what needs deciding |
| [`remove-role`](#remove-role) | Remove a role that owns no domains |
| [`component`](#component) | A component at the right layering tier |
| [`dialog`](#dialog) | A confirmation or custom dialog |
| [`add-locale`](#add-locale) | A language, seeded from the source catalog |
| [`rename`](#rename) | Change package or display name |
| [`doctor`](#doctor) | Verify the project's wiring |
| [`guardrails`](#guardrails) | Install the architecture lint rules |

---

### `create`

```bash
jinn-web create [name] [options]
```

| Option | Description | Default |
|---|---|---|
| `-n, --name <name>` | Project name (kebab-case) | prompted |
| `-a, --app-name <name>` | Display name | Title Case of the name |
| `-d, --description <text>` | package.json description | `A new Next.js app` |
| `--output <dir>` | Parent directory | `.` |
| `--roles <list>` | Comma-separated roles | `admin, member` |
| `--no-roles` | Single-audience app: flat `features/`, no role machinery | |
| `--locales <list>` | Comma-separated; first is the source | `en` |
| `--brand <hex>` | Brand colour | `#2563EB` |
| `--api-url <url>` | Backend base URL | `http://localhost:4000/api` |
| `--auth <mode>` | `bff` or `client` | `bff` |
| `--pm <manager>` | npm / pnpm / yarn / bun | `npm` |
| `--no-install` · `--no-git` | Skip install / git init | |
| `--dry-run` | Print the plan and exit | |

The brand colour generates a full `brand-50…950` ramp in OKLCH, with your hex
landing exactly on `brand-600` — which `--primary` points at, so the app's
primary colour really is your brand colour.

After installing, `create` runs `tsc` against its own output. A scaffold that
doesn't compile is a bug in the tool, and you should hear it from the tool.

### `domain`

```bash
jinn-web domain <name> --role <role>     # plural, kebab-case: vehicle-types
```

Use `--role common` for a domain two or more roles share (omit `--role` entirely
in a roleless project). `-R` picks the role interactively, `--no-page` skips the
route, `-f` overwrites existing files.

`--grouped` if your backend prefixes the resource per role (`/admin/orders`).
That's deliberately separate from whether the project has roles: role-scoped
**query keys** stop one role's cache serving another's rows and apply whenever
roles exist, while grouped **endpoints** are a fact about your URLs. Plenty of
multi-role apps have the first and not the second.

Wires: `APP_ROUTES` · `QUERY_KEYS` · nav item · `src/api.ts` · every locale
catalog · the App Router page.

### `remove-domain`

```bash
jinn-web remove-domain <name> --role <role> [--yes]
```

Deletes the files and unwires all six registries. Verified in CI by hashing the
whole source tree before and after — it restores it byte for byte.

### `role`

```bash
jinn-web role <name>
```

### `remove-role`

```bash
jinn-web remove-role <name> [--yes]
```

Refuses while the role still owns domains, and tells you which — removing them
here would silently discard code you wrote.

### `component`

```bash
jinn-web component <name> --shared          # cross-role: components/shared/
jinn-web component <name> --role lager      # features/lager/_shared/
jinn-web component <name> --domain lager/shipments
jinn-web component <name> --server          # a Server Component
```

Without a flag it asks, because placement is a real decision: start in the
domain and promote **one tier at a time** when a second consumer appears.

### `dialog`

```bash
jinn-web dialog archive --domain lager/shipments -t confirm
```

`confirm` wraps the shared `ConfirmDialog`; `custom` gives a bare shell. Form
dialogs already come with `domain`.

### `add-locale`

```bash
jinn-web add-locale de
```

Clones the source catalog with every string marked `TODO(de):`, registers it,
and lets TypeScript keep it complete from there — a missing key becomes a build
error rather than a silently-English string.

### `rename`

```bash
jinn-web rename --name new-name --app-name "New Name"
```

### `doctor`

```bash
jinn-web doctor [--fix] [--json]
```

Six checks: routes ↔ pages both ways, no inlined query keys, nav hrefs/labels/
roles resolvable, the endpoint index complete, every repository validating its
responses, catalogs at parity. `--fix` repairs the mechanical ones. Exits `2`
when it finds something, so CI can gate on it.

### `guardrails`

```bash
jinn-web guardrails [--level warn] [--dry-run]
```

Installs the architecture lint rules, with import-boundary zones generated from
*your* roles. See [Adopting in an existing project](#adopting-in-an-existing-project).

## What you get

**Stack** — Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict ·
Tailwind v4 · shadcn/ui · TanStack Query + Table · Zustand · Zod · nuqs ·
Playwright · Vitest.

**Auth that works on the server.** The refresh token lives in an httpOnly cookie
set by a thin `/api/session` handler; the access token stays in memory. Because
the server can see the cookie, `proxy.ts` redirects unauthenticated requests
*before* a page renders — no protected screen flashing while the client catches
up — and an XSS payload can't walk away with a durable session. It works against
ordinary bearer-token backends unchanged. `--auth client` opts out.

**Roles as data, not conditionals.** `ROLES` is an `as const` tuple; every map
keyed off it is a `Record<Role, …>`, so a new role is a compile error until it's
handled. Pages dispatch declaratively with `<RoleScreens>`.

**A component layer you don't have to build.** ~35 shared components —
`StatusBadge`, `TruncatedText`, `EmptyState`, `ErrorState`, `ConfirmDialog`,
`DataTable`, `Combobox`, `MultiSelect`, `DatePicker`, `Stepper`, `StatCard`,
`CommandMenu`, layout-matching skeletons — plus 11 form fields on react-hook-form
and Zod, and helpers for dates, formatting, mutations and error reporting.

**Models that actually check the wire.** Each domain owns a Zod schema with its
type inferred from it, and repositories parse in *both* directions. A bare
`backendClient.get<Order>(…)` is a claim TypeScript erases — when the backend
renames a field you get `undefined` in a component and a crash somewhere
unrelated. Here it fails at the boundary: `GET /orders → items.3.createdAt:
expected string, received null`. List rows are a narrower `.pick()` of the full
model, so a detail screen's new field never forces the backend to enrich every
list endpoint. Unknown keys are stripped, so the backend adding fields is free.

**Localization from the first line.** Typed dot-path keys, catalogs TypeScript
keeps in sync, Zod messages as translation keys. The template contains zero
hardcoded display strings.

**Tests that catch what type checking can't.** A Playwright sweep drives every
page and dialog with pathological input, asserting no layout shear, no clipped
text without a way to read it, no unnamed controls, and that auth redirects hold
— at desktop and mobile widths.

## The architecture

```
src/
├── proxy.ts                  # optimistic cookie gate (Next 16's renamed middleware)
├── app/
│   ├── (auth)/               # signed-out screens
│   ├── (app)/                # authed shell
│   └── api/session/          # the only route handlers — auth lifecycle
├── features/<role>/<domain>/ # components · api · services · models · validations · types
├── components/               # ui (shadcn) · shared · form · layout · providers
├── lib/                      # http · auth · mutations · reporting · datetime · format
├── hooks/  i18n/  constants/  validations/  config/
└── api.ts                    # index of every backend endpoint
```

**Data flows one way:**

```
component → services/ (React Query hook) → api/*.repository.ts → lib/http → backend
```

`models/` holds the wire shapes (what the backend **returns**); `validations/`
holds form input (what you **send**). They differ on purpose — a create payload
has no `id`, and a wire model has no i18n message keys.

**Placement rule.** A domain starts in its own role's folder and moves to
`common/` when a *second* role genuinely needs it. Code shared by two domains in
one role goes to `features/<role>/_shared/` — promote one tier at a time. Roles
never import each other; shared layers never import features. The lint rules
enforce all three.

Every generated project ships a `CLAUDE.md` describing this, so AI assistants
follow the same conventions you do.

## Adopting in an existing project

`guardrails` works outside `jinn-web` projects — that's mostly why it exists.

```bash
cd my-existing-app
jinn-web guardrails --level warn
```

It detects your roles from `src/features/*`, writes `eslint.config.mjs` (backing
up any existing one), then reports the violation count grouped by rule so you can
size the work before switching to `--level error`.

## Verifying your project

```bash
npm run verify   # typecheck + lint + unit tests
npm run build    # full typecheck + RSC boundary validation
npm run sweep    # Playwright: layout, a11y, auth, forms
jinn-web doctor  # architectural wiring
```

## Contributing

The template at [`templates/app`](templates/app) is a **real, runnable app** —
work on it directly with `npm run dev`, and the CLI renders it into new projects.

```bash
npm run build          # bundle the CLI
npm run verify         # typecheck + unit tests
npm run verify:create  # scaffold projects and run the full gate on them
npm run verify:all     # everything, including round-trip and doctor suites
```

CI runs all of it, plus the template's own build and sweep, on Node 22 and 24.

Design notes and the full build plan live in [`docs/`](docs/).

## Licence

MIT
