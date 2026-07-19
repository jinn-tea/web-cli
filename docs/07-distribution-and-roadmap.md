# 07 — Distribution, Skills Integration & Roadmap

How the CLI ships, stays current, plugs into the Claude skills ecosystem, and grows — plus the
build-order plan with exit criteria per milestone.

---

## 1. Distribution (Flutter CLI parity → npm)

| Concern | Flutter CLI | Web CLI |
|---|---|---|
| Registry | pub.dev (`codeable_cli`) | npm (`jinn-web`) |
| Install | `dart pub global activate codeable_cli` | `npm i -g jinn-web` **or zero-install `npx jinn-web create`** |
| Binary | `codeable_cli` | `jinn-web` |
| Self-update | `pub_updater` + post-command nag | `update-notifier` (daily check, post-command one-liner) + `jinn-web update` (prints/executes the right `npm i -g`/`pnpm add -g` line) |
| Version stamp | `build_version` → `version.dart` | `tsup` define → `version.ts` |

Publishing rules:
- `npm publish --provenance --access public` from the CI release job only (never from a laptop);
  trigger = pushed tag `vX.Y.Z`.
- `files` allowlist keeps the tarball lean but MUST include `templates/`, `assets/`, `schema/`.
- Post-publish smoke: CI runs `npx jinn-web@latest create -n smoke --no-install --dry-run`
  in a clean container.

## 2. Versioning & the template-drift problem

Semver with a CLI-specific meaning:
- **patch** — CLI bug fixes, template fixes that don't change conventions.
- **minor** — new commands/flags, new template capabilities, dependency bumps in the template.
- **major** — a *convention* change (folder shape, wiring-point shape, guardrail rule promoted
  to error) that would make `doctor`/generators disagree with previously-generated apps.

Every generated app records `cliVersion` in `jinn-web.config.json`. `doctor` check #9 nags on
major drift. Maintain `docs/MIGRATIONS.md` in the CLI repo: one section per major, with exact
manual steps (v2+ may grow `jinn-web migrate`, out of scope for v1).

`CHANGELOG.md` from day one, Flutter-CLI style (its 39KB changelog is part of why it's
trustworthy). Conventional commits (`feat:`/`fix:`/`chore:`) — release notes generated from them.

## 3. Skills & AI ecosystem integration (closing the loop)

The end state: **scaffold, rules, and audit all describe the same architecture, mechanically.**

1. **Generated apps ship AI config** (doc 02 §9): rendered CLAUDE.md + `.claude/settings.json`.
2. **Skills updated once the CLI ships** (one-line edits, do them at v1.0):
   - `web-audit` workflow step 2: *"If `jinn-web.config.json` exists, the repo was scaffolded by
     jinn-web — the standard infra names are guaranteed; run `jinn-web doctor` and
     fold its report into the findings before sweeping."*
   - `jinn-web-quality` overview: same note; Tooling Enforcement section points at
     `jinn-web guardrails` as the installer.
3. **Claude Code plugin (v1.x)** — Flutter CLI parity (it ships a companion plugin): a
   `jinn-web` plugin exposing `/create-domain`, `/doctor` as slash commands that shell out
   to the CLI, so agents drive generation through the same tested path instead of hand-writing
   boilerplate.
4. **Agent-friendliness is a feature requirement**, not an afterthought: every command
   non-interactive via flags, `--dry-run` everywhere, machine-parsable `--json` output for
   `doctor` (v1.1) so audits can consume it.

## 4. Governance for the golden template

The template is a living product with the same review bar as holos:
- Any `templates/**` PR must pass the compile-the-output CI job AND include a golden-snapshot
  update (forced review of the actual diff).
- Convention changes require: skill updates in the same PR-set + a MIGRATIONS entry + major bump.
- Dependency bumps (Next/React/Tailwind minors) are scheduled monthly; the CI matrix is the
  gatekeeper, `CHANGELOG` records them.
- Real-project feedback loop: when an audit of a scaffolded app finds a template-level flaw, the
  fix lands in the template first, then the project — the same direction holos evolved.

## 5. Build order — milestones with exit criteria

**M0 — Golden template as a repo (1–2 weeks of focused work; 70% of total value)**
Build `templates/app/` as a plain runnable Next.js repo first (name it `jinn-web-template`).
lucas_web is the **donor, not the blueprint** (doc 02 preamble): extract its proven transport /
i18n / roles / tokens, but build the redesigned parts fresh — BFF-lite auth, `lib/auth`,
nuqs URL state, the DataTable system, `RoleScreens`, dark-ready tokens, mutation helpers,
reporting seam, and the full §4 component/helper catalog. No CLI yet.
*Exit:* doc 02 §13 checklist green; you would genuinely start a client project from it.

**M1 — Engine + `create` (the npx moment)**
Doc 03 engine, then doc 04 `create` (template moves into the CLI repo, tokenized `.eta` files
carved out). Publish `0.x` to npm.
*Exit:* `npx jinn-web create` on a clean machine → app passes the full verify suite;
golden matrix + rollback tests green.

**M2 — `domain` + `remove-domain` + `doctor` (daily-driver value)**
Doc 05 §2–3 + doc 06 §1–2 (checks 1–5 first: routes, query-keys, nav, api-index, i18n).
*Exit:* wiring round-trip byte-identical; doctor seeded-breakage matrix green.

**M3 — Roles & the rest of the surface**
`role`/`remove-role`, `component`, `dialog`, `add-locale`, `rename`; doctor checks 6–9;
`create --roles` switches to invoking the real domain generator.
*Exit:* full parity matrix (doc 01 §3) implemented; `role` prints the compiler-as-checklist.

**M4 — Guardrails + adoption + v1.0.0**
`@codeable/eslint-config-web` extracted, `guardrails` command, adopt into lucas_web at `warn`
level as the real-world pilot; skills cross-references updated; docs/README polished; tag v1.0.0.
*Exit:* doc 01 §9 definition-of-done, all four points.

**v1.x roadmap (post-1.0, in rough priority):** `doctor --json` · Claude Code plugin ·
`migrate` command · optional topology-B (internal route handlers) template variant · dark-mode
token variant · `jinn-web upgrade-deps` (template-verified dependency bumps) · telemetry-free
usage docs site.

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Next.js majors break the template (16→17) | Pinned versions + monthly scheduled CI bump PRs; template compile job is the tripwire |
| Codemods meet a user-restructured file | Structural no-op + printed manual instructions (doc 03 §5.4) — never corrupt |
| Template and skills drift apart | Convention changes require same-PR skill edits (§4); `doctor` #9 nags old apps |
| Scope creep before M1 | M0/M1 exit criteria are the contract; everything else is a labeled milestone |
| Solo-maintainer bus factor | Everything in these 7 docs; CHANGELOG + MIGRATIONS discipline; CI owns quality, not memory |
