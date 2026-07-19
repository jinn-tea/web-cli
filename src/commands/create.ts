import { execa } from "execa";
import fs from "fs-extra";
import path from "node:path";
import pc from "picocolors";
import type { Command } from "commander";
import {
  normalizeHex,
  parseList,
  toTitle,
  validateHex,
  validateLocale,
  validateName,
  validateRole,
} from "../engine/naming.js";
import { findProjectRoot, type ProjectConfig } from "../engine/project.js";
import * as ui from "../engine/ui.js";
import { generateProject } from "../generators/project-generator.js";
import { version } from "../version.js";

interface CreateFlags {
  name?: string;
  appName?: string;
  description?: string;
  output?: string;
  roles?: string;
  locales?: string;
  brand?: string;
  apiUrl?: string;
  auth?: string;
  pm?: string;
  install?: boolean;
  git?: boolean;
  dryRun?: boolean;
}

export function registerCreate(program: Command): void {
  program
    .command("create")
    .description("Create a new Next.js project with the Codeable architecture.")
    .argument("[name]", "project name (kebab-case)")
    .option("-n, --name <name>", "project name (kebab-case)")
    .option("-a, --app-name <name>", 'display name (e.g. "My App")')
    .option("-d, --description <text>", "project description")
    .option("--output <dir>", "parent directory", ".")
    .option("--roles <list>", "comma-separated roles, e.g. admin,member")
    .option("--locales <list>", "comma-separated locales, first is the source")
    .option("--brand <hex>", "brand color, e.g. #2563EB")
    .option("--api-url <url>", "backend base URL")
    .option("--auth <mode>", "auth model: bff | client", "bff")
    .option("--pm <manager>", "package manager: npm | pnpm | yarn | bun")
    .option("--no-install", "skip dependency install")
    .option("--no-git", "skip git init")
    .option("--dry-run", "print what would be created and exit")
    .action(async (positionalName: string | undefined, flags: CreateFlags) => {
      await runCreate(positionalName, flags);
    });
}

async function runCreate(
  positionalName: string | undefined,
  flags: CreateFlags,
): Promise<void> {
  ui.intro("jinn-web create");

  // Refuse to nest a project inside another — almost always a mistake, and the
  // generators would then resolve the wrong root.
  const enclosing = await findProjectRoot(process.cwd());
  if (enclosing) {
    ui.fail(
      `You're already inside a jinn-web project (${pc.dim(enclosing)}).\n` +
        `Run create from outside it, or use \`jinn-web domain\` to add to this one.`,
    );
  }

  const projectName = await ui.askText(positionalName ?? flags.name, {
    message: "What is the project name?",
    defaultValue: "my-app",
    validate: (value) => validateName(value, "project name"),
  });

  const appName = await ui.askText(flags.appName, {
    message: "What is the display name of your app?",
    defaultValue: toTitle(projectName),
  });

  const rolesInput = await ui.askText(flags.roles, {
    message: "Which roles does this app have? (comma-separated)",
    placeholder: "admin, member",
    defaultValue: "admin, member",
  });

  const roles = parseList(rolesInput);
  if (roles.length === 0) {
    ui.fail("At least one role is required (a single-role app is fine).");
  }
  for (const role of roles) {
    const result = validateRole(role);
    if (!result.ok) ui.fail(result.message ?? `Invalid role "${role}".`);
  }

  const localesInput = await ui.askText(flags.locales, {
    message: "Which locales? (the first is the source language)",
    defaultValue: "en",
  });

  const locales = parseList(localesInput);
  if (locales.length === 0) ui.fail("At least one locale is required.");
  for (const locale of locales) {
    const result = validateLocale(locale);
    if (!result.ok) ui.fail(result.message ?? `Invalid locale "${locale}".`);
  }

  const brandInput = await ui.askText(flags.brand, {
    message: "Brand color (hex)?",
    defaultValue: "#2563EB",
    validate: validateHex,
  });

  const apiUrl = await ui.askText(flags.apiUrl, {
    message: "Backend API base URL?",
    defaultValue: "http://localhost:4000/api",
  });

  const authMode = flags.auth === "client" ? "client" : "bff";
  const packageManager = (flags.pm ?? "npm") as ProjectConfig["packageManager"];
  const description = flags.description ?? "A new Next.js app";

  const targetDir = path.resolve(flags.output ?? ".", projectName);

  if (await fs.pathExists(targetDir)) {
    const entries = await fs.readdir(targetDir);
    if (entries.length > 0) {
      const overwrite = await ui.askConfirm(
        `Directory ${pc.cyan(projectName)} already exists and isn't empty. Overwrite?`,
      );
      if (!overwrite) ui.fail("Cancelled — nothing was changed.");
    }
  }

  if (flags.dryRun) {
    ui.note(
      [
        `${pc.bold("Project")}   ${projectName}`,
        `${pc.bold("App name")}  ${appName}`,
        `${pc.bold("Location")}  ${targetDir}`,
        `${pc.bold("Roles")}     ${roles.join(", ")} ${pc.dim("(+ common)")}`,
        `${pc.bold("Locales")}   ${locales[0]} ${pc.dim("(source)")}${
          locales.length > 1 ? `, ${locales.slice(1).join(", ")}` : ""
        }`,
        `${pc.bold("Brand")}     ${normalizeHex(brandInput)}`,
        `${pc.bold("Auth")}      ${authMode}`,
        `${pc.bold("API")}       ${apiUrl}`,
      ].join("\n"),
      "Would create",
    );
    ui.outro(pc.dim("Dry run — nothing was written."));
    return;
  }

  await ui.step("Generating project", async () => {
    await generateProject({
      targetDir,
      projectName,
      appName,
      description,
      roles,
      locales,
      brandHex: normalizeHex(brandInput),
      apiUrl,
      authMode,
      packageManager,
      cliVersion: version,
    });
  });

  if (flags.git !== false) {
    await ui
      .step("Initializing git", async () => {
        await execa("git", ["init", "-q"], { cwd: targetDir });
        await execa("git", ["add", "-A"], { cwd: targetDir });
        await execa(
          "git",
          ["commit", "-q", "-m", "chore: scaffold with jinn-web"],
          { cwd: targetDir },
        );
      })
      // A missing git, or no configured identity, must not fail a scaffold.
      .catch(() => ui.warn("Skipped git init (git unavailable or unconfigured)."));
  }

  if (flags.install !== false) {
    await ui
      .step(`Installing dependencies (${packageManager})`, async () => {
        await execa(packageManager, ["install"], { cwd: targetDir });
      })
      .catch(() => {
        ui.warn(
          `Dependency install failed — the project is fine, run \`${packageManager} install\` yourself.`,
        );
      });

    // Verify what we just produced. A scaffold that doesn't compile is a CLI
    // bug, and the user should hear it from us rather than discover it later.
    await ui
      .step("Verifying the generated project", async () => {
        await execa("npx", ["tsc", "--noEmit"], { cwd: targetDir });
      })
      .catch(() => {
        ui.warn(
          "The generated project did not typecheck. This is a CLI bug — please report it.",
        );
      });
  }

  // A relative path is friendlier when the project is under the cwd, and
  // actively worse when it isn't (`cd ../../../../private/tmp/...`).
  const relative = path.relative(process.cwd(), targetDir);
  const displayPath =
    !relative || relative.startsWith("..") ? targetDir : `./${relative}`;

  ui.note(
    [
      `${pc.bold("Location")}  ${displayPath}`,
      `${pc.bold("Roles")}     ${roles.join(", ")} ${pc.dim("(+ common)")}`,
      `${pc.bold("Locales")}   ${locales.join(", ")}`,
      `${pc.bold("Brand")}     ${normalizeHex(brandInput)}`,
    ].join("\n"),
    `${appName} created`,
  );

  ui.outro(
    [
      `${pc.bold("Next steps")}`,
      `  cd ${displayPath}`,
      `  ${packageManager} run dev`,
      "",
      `  ${pc.dim("Add a domain:")}  jinn-web domain <name> --role ${roles[0]}`,
      `  ${pc.dim("Add a role:")}    jinn-web role <name>`,
      `  ${pc.dim("Check wiring:")}  jinn-web doctor`,
    ].join("\n"),
  );
}
