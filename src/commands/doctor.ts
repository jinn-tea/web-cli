import fs from "fs-extra";
import path from "node:path";
import pc from "picocolors";
import type { Command } from "commander";
import { requireProject } from "../engine/project.js";
import * as ui from "../engine/ui.js";
import { CHECKS } from "../doctor/checks.js";
import type { CheckContext, Issue } from "../doctor/types.js";

export function registerDoctor(program: Command): void {
  program
    .command("doctor")
    .description("Check that the project's wiring is still intact.")
    .option("--fix", "repair the issues that can be fixed mechanically")
    .option("--json", "machine-readable output")
    .action(async (flags: { fix?: boolean; json?: boolean }) => {
      await runDoctor(flags);
    });
}

async function buildContext(root: string, project: Awaited<ReturnType<typeof requireProject>>): Promise<CheckContext> {
  const abs = (relative: string) => path.join(root, relative);

  return {
    project,
    abs,
    read: async (relative) => {
      const target = abs(relative);
      return (await fs.pathExists(target))
        ? fs.readFile(target, "utf8")
        : null;
    },
    walk: async (relative, filter) => {
      const base = abs(relative);
      if (!(await fs.pathExists(base))) return [];

      const found: string[] = [];
      const visit = async (dir: string): Promise<void> => {
        for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
          if (entry.name === "node_modules") continue;
          const absolute = path.join(dir, entry.name);
          if (entry.isDirectory()) await visit(absolute);
          else {
            const relativePath = path.relative(root, absolute);
            if (!filter || filter(relativePath)) found.push(relativePath);
          }
        }
      };
      await visit(base);
      return found.sort();
    },
  };
}

function describe(issue: Issue): string {
  const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
  return `${pc.dim(location)} — ${issue.message}`;
}

async function runDoctor(flags: { fix?: boolean; json?: boolean }): Promise<void> {
  const project = await requireProject(process.cwd()).catch((error: Error) =>
    ui.fail(error.message),
  );
  const context = await buildContext(project.root, project);

  if (!flags.json) ui.intro("codeable-web doctor");

  const results: { id: string; title: string; issues: Issue[] }[] = [];
  for (const check of CHECKS) {
    results.push({
      id: check.id,
      title: check.title,
      issues: await check.run(context),
    });
  }

  let fixedCount = 0;
  if (flags.fix) {
    for (const check of CHECKS) {
      const result = results.find((entry) => entry.id === check.id);
      if (!check.fix || !result || result.issues.length === 0) continue;
      fixedCount += await check.fix(context, result.issues);
    }

    // Re-run so the report reflects reality after the repairs.
    if (fixedCount > 0) {
      for (const check of CHECKS) {
        const result = results.find((entry) => entry.id === check.id)!;
        result.issues = await check.run(context);
      }
    }
  }

  const all = results.flatMap((result) => result.issues);
  const errors = all.filter((issue) => !issue.warning);
  const warnings = all.filter((issue) => issue.warning);

  if (flags.json) {
    process.stdout.write(
      `${JSON.stringify({ checks: results, fixed: fixedCount }, null, 2)}\n`,
    );
    process.exit(errors.length > 0 ? 2 : 0);
  }

  for (const result of results) {
    const failures = result.issues.filter((issue) => !issue.warning);
    const notes = result.issues.filter((issue) => issue.warning);

    if (result.issues.length === 0) {
      ui.info(`${pc.green("✓")} ${result.title}`);
      continue;
    }
    ui.info(
      `${failures.length > 0 ? pc.red("✗") : pc.yellow("!")} ${result.title}\n` +
        result.issues.map((issue) => `    ${describe(issue)}`).join("\n"),
    );
    void notes;
  }

  const fixable = errors.filter((issue) => issue.fixable).length;
  const summary = [
    `${results.length - results.filter((r) => r.issues.some((i) => !i.warning)).length}/${results.length} checks passed`,
    errors.length > 0 ? `${errors.length} issue(s)` : null,
    warnings.length > 0 ? `${warnings.length} warning(s)` : null,
    fixedCount > 0 ? `${fixedCount} fixed` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  ui.outro(
    errors.length === 0
      ? pc.green(summary)
      : `${summary}${fixable > 0 && !flags.fix ? pc.dim(`\n  ${fixable} fixable — run \`codeable-web doctor --fix\``) : ""}`,
  );

  // Exit 2 signals "issues found" so CI can gate on it without confusing it
  // with a crash (exit 3).
  if (errors.length > 0) process.exit(2);
}
