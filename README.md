# codeable-web-cli

A Node/TypeScript CLI that scaffolds and grows production-ready Next.js (App Router) apps with
the Codeable web architecture — the web equivalent of the Codeable Flutter CLI (`codeable_cli`),
matched command-for-command and deliberately better where it is weak.

**Status:** M0 in progress — the golden template is being built at
[`templates/app/`](templates/app/) as a real runnable Next.js 16 app (see its
[README](templates/app/README.md) for what's landed). The complete build plan lives in
[`docs/`](docs/):

1. [Vision & Architecture](docs/01-vision-and-architecture.md) — goals, parity matrix vs the Flutter CLI, repo layout, execution model
2. [The Golden Template](docs/02-golden-template.md) — every file `create` emits (70% of the value)
3. [CLI Skeleton & Engine](docs/03-cli-skeleton-and-engine.md) — template engine, ts-morph codemods, transactional FS
4. [`create`](docs/04-create-command.md) — flags, prompts, pipeline, brand-ramp math, roles
5. [Generators](docs/05-generators.md) — `domain`, `role`, `component`, `dialog`, `add-locale`, `rename`, removals
6. [Doctor, Guardrails & Testing](docs/06-doctor-guardrails-testing.md) — 9 health checks, the ESLint pack, test strategy
7. [Distribution & Roadmap](docs/07-distribution-and-roadmap.md) — npm, versioning, skills integration, milestones M0–M4

Start at **M0** (doc 07 §5): build the golden template as a standalone repo first.
