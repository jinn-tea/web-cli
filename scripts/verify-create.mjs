#!/usr/bin/env node
/**
 * Scaffold a project and verify it end to end.
 *
 * This is THE test that matters: everything else checks pieces, this checks
 * that `create` produces a project which actually compiles, lints, tests and
 * builds. Both of the real bugs found during M1 (the `as const` catalog and the
 * brand ramp anchoring) were only visible here.
 *
 * Lives in a script rather than inline YAML so it runs identically on a laptop
 * and in CI — a pipeline you can't reproduce locally is a pipeline you debug by
 * pushing commits.
 *
 * Usage:
 *   node scripts/verify-create.mjs                 # all scenarios
 *   node scripts/verify-create.mjs multi-role      # one scenario
 *   node scripts/verify-create.mjs --keep          # leave the output for inspection
 */
import { execa } from "execa";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Deliberately varied: single-role and multi-role take different template
 * branches (the dashboard page renders `RoleScreens` only when there are 2+),
 * and a second locale is what exercises the `satisfies Messages` typing.
 */
const SCENARIOS = [
  {
    name: "minimal",
    args: ["--roles", "user", "--locales", "en"],
  },
  {
    // A roleless project takes a genuinely different template shape: no Role
    // type, no guards, flat features/. It has to compile on its own terms.
    name: "roleless",
    args: ["--no-roles", "--locales", "en"],
  },
  {
    name: "multi-role",
    args: [
      "--roles",
      "lager,forwarder,admin",
      "--locales",
      "en,de",
      "--brand",
      "#10B981",
      "--app-name",
      "Lager Ops",
    ],
  },
];

const keep = process.argv.includes("--keep");
const only = process.argv.find((arg) => !arg.startsWith("--") && SCENARIOS.some((s) => s.name === arg));
const scenarios = only ? SCENARIOS.filter((s) => s.name === only) : SCENARIOS;

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function run(command, args, cwd) {
  await execa(command, args, { cwd, stdio: "inherit" });
}

async function verifyScenario(scenario) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `jinn-web-${scenario.name}-`));
  const projectName = `verify-${scenario.name}`;
  const projectDir = path.join(workDir, projectName);

  log(`\n▸ ${scenario.name}`);

  try {
    // Scaffold. --no-install so we control the install below and can cache it.
    await run(
      "node",
      [
        path.join(repoRoot, "bin/jinn-web.js"),
        "create",
        projectName,
        ...scenario.args,
        "--output",
        workDir,
        "--no-install",
        "--no-git",
      ],
      repoRoot,
    );

    await run("npm", ["install", "--no-audit", "--no-fund"], projectDir);

    // The full gate. Any failure here is a CLI bug, not a user error.
    await run("npx", ["tsc", "--noEmit"], projectDir);
    await run("npm", ["run", "lint"], projectDir);
    await run("npm", ["test"], projectDir);
    await run("npm", ["run", "build"], projectDir);

    log(`✓ ${scenario.name} — compiles, lints, tests and builds`);
  } finally {
    if (keep) {
      log(`  kept at ${projectDir}`);
    } else {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }
}

// Build the CLI first so we verify the SHIPPED bundle, not the sources.
log("Building the CLI…");
await run("npm", ["run", "build"], repoRoot);

for (const scenario of scenarios) {
  await verifyScenario(scenario);
}

log(`\nAll ${scenarios.length} scenario(s) passed.`);
