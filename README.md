# jinn-web

A Node/TypeScript CLI that scaffolds and grows production-ready Next.js (App Router) apps with the
Codeable web architecture — the web counterpart to the Codeable Flutter CLI, matched command-for-
command and deliberately better where that one is weak.

> Not published to npm yet — install from the repo:
> `npm i -g github:jinn-tea/web-cli`

```bash
npx jinn-web create my-app --roles admin,member --locales en,de --brand "#2563EB"
```

```bash
jinn-web domain orders --role admin   # 9 files, 6 registries wired
jinn-web role lager                   # + the compiler's decision checklist
jinn-web add-locale de                # catalog seeded, every string marked
jinn-web doctor --fix                 # verify the wiring is still intact
jinn-web guardrails --level warn      # install the rules in an existing repo
```

The generated app passes `typecheck`, `lint`, unit tests, `build` and a Playwright sweep out of the
box — and `create` verifies that itself before handing the project over.

## Status

| Milestone | State |
|---|---|
| **M0** — golden template | ✅ complete — [`templates/app`](templates/app) is a real runnable app |
| **M1** — engine + `create` | ✅ working end to end |
| **M2** — `domain` + `doctor` | ✅ complete |
| **M3** — `role`, `component`, `dialog`, `add-locale`, `rename` | ✅ complete |
| **M4** — guardrails, adoption, v1.0.0 | ✅ complete — publish deferred by choice |

## What `create` produces

Next.js 16 · React 19 · TypeScript strict · Tailwind v4 tokens · shadcn/ui · TanStack Query +
Table · Zustand · Zod · nuqs URL state · typed i18n · **BFF cookie auth** (httpOnly refresh token,
server-side gating via `proxy.ts`) · role-first feature folders with exhaustive role maps ·
~29 shared components · 11 form fields · ESLint guardrails that enforce the layering rules.

See [`templates/app/README.md`](templates/app/README.md) for the full inventory.

## Development

```bash
npm run build      # bundle the CLI
npm run verify     # typecheck + unit tests
node bin/jinn-web.js create demo --roles a,b --no-install --no-git
```

The template is a real app — work on it directly:

```bash
cd templates/app && npm run dev
```

## Documentation

The complete build plan lives in [`docs/`](docs/):

1. [Vision & Architecture](docs/01-vision-and-architecture.md)
2. [The Golden Template](docs/02-golden-template.md)
3. [CLI Skeleton & Engine](docs/03-cli-skeleton-and-engine.md)
4. [`create`](docs/04-create-command.md)
5. [Generators](docs/05-generators.md)
6. [Doctor, Guardrails & Testing](docs/06-doctor-guardrails-testing.md)
7. [Distribution & Roadmap](docs/07-distribution-and-roadmap.md)
