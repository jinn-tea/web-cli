import pc from "picocolors";
import type { Command } from "commander";
import { validateRole } from "../engine/naming.js";
import { requireProject } from "../engine/project.js";
import * as ui from "../engine/ui.js";
import { addRole, removeRole } from "../generators/role-generator.js";

export function registerRole(program: Command): void {
  program
    .command("role")
    .description("Add a role, then report every decision the compiler surfaces.")
    .argument("<name>", "role name (kebab-case)")
    .action(async (name: string) => {
      await runAddRole(name);
    });

  program
    .command("remove-role")
    .description("Remove a role that no longer owns any domains.")
    .argument("<name>", "role name")
    .option("-y, --yes", "skip the confirmation")
    .action(async (name: string, flags: { yes?: boolean }) => {
      await runRemoveRole(name, flags);
    });
}

async function runAddRole(name: string): Promise<void> {
  const validation = validateRole(name);
  if (!validation.ok) ui.fail(validation.message ?? "Invalid role name.");

  const project = await requireProject(process.cwd()).catch((error: Error) =>
    ui.fail(error.message),
  );

  if (project.config.roles.includes(name)) {
    ui.fail(`"${name}" is already a role in this project.`);
  }

  ui.intro(`jinn-web role ${name}`);

  const result = await ui.step(`Adding role "${name}"`, () =>
    addRole(project, name),
  );

  if (result.migration) {
    ui.note(
      [
        ...result.migration.moved.map((entry) => `${pc.cyan("→")} ${entry}`),
        `${pc.green("✓")} ${result.migration.restored.length} file(s) restored to their role-first shape`,
      ].join("\n"),
      "Converted from roleless to role-first",
    );
  }

  ui.note(
    [
      ...result.wired.map((entry) => `${pc.green("✓")} ${entry}`),
      ...result.created.map((entry) => `${pc.green("+")} ${entry}`),
    ].join("\n"),
    `Role "${name}" added`,
  );

  if (result.migration?.notes.length) {
    ui.note(result.migration.notes.join("\n\n"), "Worth knowing");
  }

  if (result.checklist.length === 0) {
    ui.outro(
      [
        pc.green("The project still compiles — nothing else to decide."),
        "",
        `  ${pc.dim("Give it a domain:")} jinn-web domain <name> --role ${name}`,
      ].join("\n"),
    );
    return;
  }

  // This is the payoff for every `Record<Role, …>` in the architecture: rather
  // than hoping someone remembers which switches need a new case, the compiler
  // enumerates them.
  ui.note(
    result.checklist
      .map((item) => `${pc.yellow("☐")} ${pc.dim(`${item.file}:${item.line}`)}\n   ${item.message}`)
      .join("\n"),
    `${result.checklist.length} place(s) need a decision`,
  );

  ui.outro(
    [
      "The exhaustiveness guards found these — each one is a choice only you can make.",
      "",
      `  ${pc.dim("Then:")} jinn-web domain <name> --role ${name}`,
    ].join("\n"),
  );
}

async function runRemoveRole(
  name: string,
  flags: { yes?: boolean },
): Promise<void> {
  const project = await requireProject(process.cwd()).catch((error: Error) =>
    ui.fail(error.message),
  );

  if (!project.config.roles.includes(name)) {
    ui.fail(`"${name}" isn't a role in this project.`);
  }
  if (project.config.roles.length === 1) {
    ui.fail("This is the project's only role — an app needs at least one.");
  }

  ui.intro(`jinn-web remove-role ${name}`);

  if (!flags.yes) {
    const confirmed = await ui.askConfirm(
      `Remove role "${name}" and its ${pc.dim(`src/features/${name}/`)} folder?`,
    );
    if (!confirmed) ui.fail("Cancelled — nothing was changed.");
  }

  const result = await ui.step(`Removing role "${name}"`, () =>
    removeRole(project, name),
  );

  if (result.blockedBy.length > 0) {
    ui.fail(
      `"${name}" still owns ${result.blockedBy.length} domain(s): ${result.blockedBy.join(", ")}.\n` +
        `Remove or migrate them first — deleting them here would discard real code:\n` +
        result.blockedBy
          .map((domain) => `  jinn-web remove-domain ${domain} --role ${name}`)
          .join("\n"),
    );
  }

  ui.outro(`Removed ${result.removed.length} item(s).`);
}
