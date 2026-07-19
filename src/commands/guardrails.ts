import { execa } from "execa";
import fs from "fs-extra";
import path from "node:path";
import pc from "picocolors";
import type { Command } from "commander";
import { formatSource } from "../engine/format.js";
import { renderGuardrailConfig } from "../engine/guardrails.js";
import { parseList } from "../engine/naming.js";
import { findProjectRoot, readConfig } from "../engine/project.js";
import * as ui from "../engine/ui.js";

/**
 * `guardrails` — install the lint rules into a project.
 *
 * Deliberately works OUTSIDE codeable-web projects too: the main reason it
 * exists is adopting the architecture in a codebase that predates the CLI,
 * which is exactly where the rules pay for themselves and exactly where
 * "hundreds of errors on day one" would get them switched off. Hence
 * `--level warn` and a report rather than a gate.
 */
export function registerGuardrails(program: Command): void {
  program
    .command("guardrails")
    .description("Install the architecture lint rules into this project.")
    .option("--roles <list>", "comma-separated roles (detected when omitted)")
    .option("--level <level>", "error | warn", "error")
    .option("--dry-run", "print the config without writing it")
    .option("-y, --yes", "overwrite an existing eslint.config.mjs without asking")
    .action(
      async (flags: {
        roles?: string;
        level?: string;
        dryRun?: boolean;
        yes?: boolean;
      }) => {
        await runGuardrails(flags);
      },
    );
}

async function detectRoles(root: string): Promise<string[]> {
  const configRoot = await findProjectRoot(root);
  if (configRoot) {
    const config = await readConfig(configRoot);
    return [...config.roles, "common"];
  }

  // Not a codeable-web project — infer from the folder structure.
  const featuresDir = path.join(root, "src", "features");
  if (!(await fs.pathExists(featuresDir))) return [];

  const entries = await fs.readdir(featuresDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);
}

async function runGuardrails(flags: {
  roles?: string;
  level?: string;
  dryRun?: boolean;
  yes?: boolean;
}): Promise<void> {
  const root = process.cwd();
  ui.intro("codeable-web guardrails");

  if (!(await fs.pathExists(path.join(root, "package.json")))) {
    ui.fail("No package.json here — run this from the project root.");
  }

  const roles = flags.roles ? parseList(flags.roles) : await detectRoles(root);
  if (roles.length === 0) {
    ui.warn(
      "No roles detected (no src/features/* directories). Boundary rules will cover the shared layers only.",
    );
  }

  const severity = flags.level === "warn" ? "warn" : "error";

  const pkg = (await fs.readJson(path.join(root, "package.json"))) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const withQuery = Boolean(deps["@tanstack/eslint-plugin-query"]);

  const config = await formatSource(
    renderGuardrailConfig({ roles, severity, withQuery }),
    path.join(root, "eslint.config.mjs"),
  );

  if (flags.dryRun) {
    process.stdout.write(`\n${config}\n`);
    ui.outro(pc.dim("Dry run — nothing was written."));
    return;
  }

  const target = path.join(root, "eslint.config.mjs");
  if ((await fs.pathExists(target)) && !flags.yes) {
    const overwrite = await ui.askConfirm(
      "eslint.config.mjs already exists. Replace it? (a backup is kept)",
    );
    if (!overwrite) ui.fail("Cancelled — nothing was changed.");
  }

  if (await fs.pathExists(target)) {
    // Keep the original: these rules will need tuning against a real codebase,
    // and losing a hand-tuned config to a generator is unforgivable.
    await fs.copy(target, `${target}.bak`, { overwrite: true });
  }
  await fs.writeFile(target, config, "utf8");

  ui.note(
    [
      `${pc.green("✓")} eslint.config.mjs ${pc.dim(`(${severity})`)}`,
      roles.length
        ? `${pc.green("✓")} boundary rules for: ${roles.join(", ")}`
        : `${pc.dim("•")} no role boundaries (none detected)`,
      withQuery
        ? `${pc.green("✓")} TanStack Query plugin enabled`
        : `${pc.dim("•")} TanStack Query plugin not installed — skipped`,
    ].join("\n"),
    "Guardrails installed",
  );

  // Report rather than gate. An existing codebase will have violations; the
  // point is to show the size of the problem, not to fail the command.
  //
  // `--format json` because it's the only machine-readable formatter still in
  // core — `compact` was extracted to a separate package, and asking for it
  // makes eslint exit with an error whose output looks EMPTY. Filtering that
  // for violations finds none and reports "no violations", which is a false
  // green: the worst possible outcome for a tool whose job is finding problems.
  // Run the PROJECT's eslint binary, not `npx eslint`. npx will happily fetch
  // a fresh eslint from the registry when it can't resolve one, which then
  // lints with none of the project's plugins — and reports a very confident,
  // very wrong answer.
  const localEslint = path.join(root, "node_modules", ".bin", "eslint");
  if (!(await fs.pathExists(localEslint))) {
    ui.warn(
      "eslint isn't installed here — the config is written; run your install, then `npx eslint`.",
    );
    ui.outro("Guardrails installed.");
    return;
  }

  const result = await ui
    .step("Running eslint", () =>
      execa(localEslint, ["--format", "json"], { cwd: root, reject: false }),
    )
    .catch(() => null);

  if (!result) return;

  interface EslintMessage {
    ruleId: string | null;
    severity: number;
  }
  interface EslintResult {
    messages: EslintMessage[];
  }

  let parsed: EslintResult[];
  try {
    parsed = JSON.parse(result.stdout) as EslintResult[];
  } catch {
    // Say so rather than implying a clean bill of health.
    ui.warn(
      "Could not read eslint's output — the config is written, but run `npx eslint` yourself to see the state.",
    );
    if (result.stderr) ui.info(pc.dim(result.stderr.split("\n").slice(0, 3).join("\n")));
    ui.outro("Guardrails installed.");
    return;
  }

  const messages = parsed.flatMap((entry) => entry.messages);
  if (messages.length === 0) {
    ui.outro(pc.green("No violations — the codebase already follows the rules."));
    return;
  }

  // Group by rule so the report says WHAT to fix, not just how much.
  const byRule = new Map<string, number>();
  for (const message of messages) {
    const rule = message.ruleId ?? "(parse error)";
    byRule.set(rule, (byRule.get(rule) ?? 0) + 1);
  }

  const summary = [...byRule.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([rule, count]) => `  ${String(count).padStart(4)}  ${rule}`)
    .join("\n");

  ui.note(summary, `${messages.length} violation(s)`);
  ui.outro(
    severity === "error"
      ? `Adopt gradually with ${pc.cyan("--level warn")}, then ratchet up as they're fixed.`
      : "Reported as warnings — fix them, then re-run with --level error.",
  );
}
