import fs from "fs-extra";
import path from "node:path";
import pc from "picocolors";
import type { Command } from "commander";
import { validateName } from "../engine/naming.js";
import { allRoles, listDomains, requireProject } from "../engine/project.js";
import * as ui from "../engine/ui.js";
import {
  deriveNames,
  domainFilePaths,
  generateDomain,
  removeDomain,
} from "../generators/domain-generator.js";

export function registerDomain(program: Command): void {
  program
    .command("domain")
    .description("Generate a domain (CRUD screen, hooks, repository) and wire it up.")
    .argument("<name>", "domain name, plural kebab-case (e.g. vehicle-types)")
    .option("-r, --role <role>", "role that owns it, or 'common'")
    .option("-R, --pick-role", "choose the role interactively")
    .option("--no-page", "skip the App Router page")
    .option("-f, --force", "overwrite existing files without asking")
    .option(
      "--grouped",
      "backend prefixes this resource per role (/admin/orders)",
    )
    .action(
      async (
        name: string,
        flags: {
          role?: string;
          pickRole?: boolean;
          page?: boolean;
          force?: boolean;
          grouped?: boolean;
        },
      ) => {
        await runDomain(name, flags);
      },
    );

  program
    .command("remove-domain")
    .description("Remove a domain and unwire it (the exact inverse of `domain`).")
    .argument("<name>", "domain name")
    .option("-r, --role <role>", "role that owns it")
    .option("-y, --yes", "skip the confirmation")
    .action(async (name: string, flags: { role?: string; yes?: boolean }) => {
      await runRemoveDomain(name, flags);
    });
}

/** Resolve the owning role from a flag, a picker, or the only sensible default. */
async function resolveRole(
  roles: string[],
  flag: string | undefined,
  pick: boolean | undefined,
): Promise<string> {
  if (flag) {
    if (!roles.includes(flag)) {
      ui.fail(
        `"${flag}" isn't a role in this project. Available: ${roles.join(", ")}.\n` +
          `Add it with \`jinn-web role ${flag}\`.`,
      );
    }
    return flag;
  }

  // A single-role project has exactly one meaningful answer besides common.
  if (!pick && roles.length === 2) return roles[0]!;

  return ui.askSelect(
    "Which role owns this domain?",
    roles.map((role) => ({
      value: role,
      label: role,
      hint:
        role === "common"
          ? "shared by every role — only when two genuinely need it"
          : undefined,
    })),
  );
}

async function runDomain(
  input: string,
  flags: {
          role?: string;
          pickRole?: boolean;
          page?: boolean;
          force?: boolean;
          grouped?: boolean;
        },
): Promise<void> {
  const validation = validateName(input, "domain name");
  if (!validation.ok) ui.fail(validation.message ?? "Invalid domain name.");

  const project = await requireProject(process.cwd()).catch((error: Error) =>
    ui.fail(error.message),
  );

  ui.intro(`jinn-web domain ${input}`);

  // A roleless project has nowhere to put a role, so don't ask for one.
  const role = project.config.roles.length
    ? await resolveRole(allRoles(project.config), flags.role, flags.pickRole)
    : "";
  const names = deriveNames(input, role);
  const paths = domainFilePaths(names);
  const label = role ? `${role}/${names.name}` : names.name;

  if (!flags.force && (await fs.pathExists(path.join(project.root, paths.dir)))) {
    // Re-running is safe (the wiring codemods no-op), but overwriting a
    // domain's FILES would discard hand-written code — so that needs consent,
    // and the non-interactive default is "no".
    const overwrite = await ui.askConfirm(
      `Domain ${pc.cyan(label)} already exists. Overwrite its files?`,
    );
    if (!overwrite) ui.fail("Cancelled — nothing was changed. Pass --force to overwrite.");
  }

  const result = await ui.step(`Generating ${label}`, () =>
    generateDomain(project, names, {
      withPage: flags.page !== false,
      groupedEndpoints: Boolean(flags.grouped),
    }),
  );

  ui.note(
    [
      ...result.wired.map((entry) => `${pc.green("✓")} ${entry}`),
      ...result.skipped.map((entry) => `${pc.dim("•")} ${pc.dim(`${entry} (already wired)`)}`),
    ].join("\n"),
    `${names.titleName} wired up`,
  );

  ui.outro(
    [
      `${result.created.length} files created.`,
      "",
      `  ${pc.dim("Navigate:")}  <Link href={APP_ROUTES.${names.camelName}}>`,
      `  ${pc.dim("Entity:")}    edit ${paths.dir}/types/index.ts`,
      `  ${pc.dim("Endpoints:")} edit ${paths.dir}/constants.ts`,
      `  ${pc.dim("Check:")}     jinn-web doctor`,
    ].join("\n"),
  );
}

async function runRemoveDomain(
  input: string,
  flags: { role?: string; yes?: boolean },
): Promise<void> {
  const project = await requireProject(process.cwd()).catch((error: Error) =>
    ui.fail(error.message),
  );

  ui.intro(`jinn-web remove-domain ${input}`);

  // Find which role owns it rather than making the user remember.
  let role = flags.role;
  if (!role) {
    const owners: string[] = [];
    for (const candidate of allRoles(project.config)) {
      const domains = await listDomains(project.root, candidate);
      if (domains.includes(input)) owners.push(candidate);
    }

    if (owners.length === 0) {
      ui.fail(`No domain named "${input}" found in this project.`);
    }
    role =
      owners.length === 1
        ? owners[0]!
        : await ui.askSelect(
            `"${input}" exists under more than one role. Which one?`,
            owners.map((owner) => ({ value: owner, label: owner })),
          );
  }

  const names = deriveNames(input, role);
  const paths = domainFilePaths(names);

  if (!flags.yes) {
    ui.note(
      [
        `${pc.red("-")} ${paths.dir}/`,
        `${pc.red("-")} ${paths.page}`,
        `${pc.yellow("~")} routes, query keys, nav, api.ts and every locale catalog`,
      ].join("\n"),
      "Will remove",
    );
    const confirmed = await ui.askConfirm(`Remove ${role}/${names.name}?`);
    if (!confirmed) ui.fail("Cancelled — nothing was changed.");
  }

  const result = await ui.step(`Removing ${role}/${names.name}`, () =>
    removeDomain(project, names),
  );

  ui.outro(
    `Removed ${result.deleted.length} path(s) and unwired ${result.unwired.length} registry entr${
      result.unwired.length === 1 ? "y" : "ies"
    }.`,
  );
}
