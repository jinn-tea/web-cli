import fs from "fs-extra";
import path from "node:path";
import pc from "picocolors";
import type { Command } from "commander";
import {
  addObjectProperty,
  createProject,
  openFile,
} from "../engine/codemods.js";
import { formatSource } from "../engine/format.js";
import { LOCALE_NATIVE_NAMES } from "../engine/locale-names.js";
import {
  toKebab,
  toPascal,
  toTitle,
  validateLocale,
  validateName,
} from "../engine/naming.js";
import {
  allRoles,
  listDomains,
  requireProject,
  writeConfig,
} from "../engine/project.js";
import { renderString, templatesRoot } from "../engine/template.js";
import { identifierFor, seedLocaleCatalog } from "../engine/transforms.js";
import * as ui from "../engine/ui.js";

/**
 * The smaller generators: `component`, `dialog`, `add-locale` and `rename`.
 *
 * Each is small enough that the interesting part is the DECISION it encodes —
 * where a component belongs, what a dialog wraps — rather than the file it
 * writes.
 */

async function renderTemplate(
  group: string,
  file: string,
  vars: object,
  target: string,
): Promise<string> {
  const source = await fs.readFile(
    path.join(templatesRoot(), group, file),
    "utf8",
  );
  return formatSource(renderString(source, vars), target);
}

export function registerMisc(program: Command): void {
  registerComponent(program);
  registerDialog(program);
  registerAddLocale(program);
  registerRename(program);
}

function registerComponent(program: Command): void {
  program
    .command("component")
    .description("Create a component at the right layering tier.")
    .argument("<name>", "component name (kebab-case)")
    .option("--shared", "cross-role: components/shared/")
    .option("--role <role>", "shared within one role: features/<role>/_shared/")
    .option("--domain <role/domain>", "local to one domain")
    .option("--server", "a Server Component (no 'use client')")
    .action(
      async (
        name: string,
        flags: {
          shared?: boolean;
          role?: string;
          domain?: string;
          server?: boolean;
        },
      ) => {
        const validation = validateName(name, "component name");
        if (!validation.ok) ui.fail(validation.message ?? "Invalid name.");

        const project = await requireProject(process.cwd()).catch((error: Error) =>
          ui.fail(error.message),
        );
        ui.intro(`jinn-web component ${name}`);

        // The three-tier placement rule, made a prompt: promote one tier at a
        // time, and judge by the component's API rather than by today's usage.
        let tier: "shared" | "role" | "domain";
        let role = "";
        let domain = "";

        if (flags.shared) tier = "shared";
        else if (flags.domain) {
          tier = "domain";
          [role = "", domain = ""] = flags.domain.split("/");
        } else if (flags.role) {
          tier = "role";
          role = flags.role;
        } else {
          tier = await ui.askSelect("Where does this component belong?", [
            {
              value: "domain" as const,
              label: "One domain",
              hint: "start here — promote later if a second domain needs it",
            },
            {
              value: "role" as const,
              label: "Shared within a role",
              hint: "two or more domains under the same role",
            },
            {
              value: "shared" as const,
              label: "Cross-role (components/shared)",
              hint: "domain-free and parameterized",
            },
          ]);

          if (tier !== "shared") {
            role = await ui.askSelect(
              "Which role?",
              allRoles(project.config).map((value) => ({ value, label: value })),
            );
          }
          if (tier === "domain") {
            const domains = await listDomains(project.root, role);
            if (domains.length === 0) {
              ui.fail(`Role "${role}" has no domains yet — create one first.`);
            }
            domain = await ui.askSelect(
              "Which domain?",
              domains.map((value) => ({ value, label: value })),
            );
          }
        }

        const kebab = toKebab(name);
        const relative =
          tier === "shared"
            ? `src/components/shared/${kebab}.tsx`
            : tier === "role"
              ? `src/features/${role}/_shared/components/${kebab}.tsx`
              : `src/features/${role}/${domain}/components/${kebab}.tsx`;

        const target = path.join(project.root, relative);
        if (await fs.pathExists(target)) {
          ui.fail(`${relative} already exists.`);
        }

        await fs.outputFile(
          target,
          await renderTemplate(
            "component",
            "component.tsx.eta",
            {
              Name: toPascal(kebab),
              titleName: toTitle(kebab),
              tier,
              role,
              domain,
              isClient: !flags.server,
            },
            target,
          ),
        );

        ui.outro(`${pc.green("+")} ${relative}`);
      },
    );
}

function registerDialog(program: Command): void {
  program
    .command("dialog")
    .description("Create a dialog inside a domain.")
    .argument("<name>", "dialog name (kebab-case)")
    .option("--domain <role/domain>", "owning domain")
    .option("-t, --type <type>", "confirm | custom", "custom")
    .action(
      async (name: string, flags: { domain?: string; type?: string }) => {
        const validation = validateName(name, "dialog name");
        if (!validation.ok) ui.fail(validation.message ?? "Invalid name.");

        const project = await requireProject(process.cwd()).catch((error: Error) =>
          ui.fail(error.message),
        );
        ui.intro(`jinn-web dialog ${name}`);

        let role = "";
        let domain = "";
        if (flags.domain) {
          [role = "", domain = ""] = flags.domain.split("/");
        } else {
          role = await ui.askSelect(
            "Which role owns it?",
            allRoles(project.config).map((value) => ({ value, label: value })),
          );
          const domains = await listDomains(project.root, role);
          if (domains.length === 0) {
            ui.fail(`Role "${role}" has no domains yet — create one first.`);
          }
          domain = await ui.askSelect(
            "Which domain?",
            domains.map((value) => ({ value, label: value })),
          );
        }

        const kebab = toKebab(name);
        const relative = `src/features/${role}/${domain}/components/${kebab}-dialog.tsx`;
        const target = path.join(project.root, relative);
        if (await fs.pathExists(target)) ui.fail(`${relative} already exists.`);

        // A "form" dialog is what `domain` already generates, so the two useful
        // extras are a confirmation wrapper and a blank shell.
        const template =
          flags.type === "confirm"
            ? "dialog-confirm.tsx.eta"
            : "dialog-custom.tsx.eta";

        await fs.outputFile(
          target,
          await renderTemplate(
            "component",
            template,
            { Name: toPascal(kebab), titleName: toTitle(kebab) },
            target,
          ),
        );

        ui.outro(`${pc.green("+")} ${relative}`);
      },
    );
}

function registerAddLocale(program: Command): void {
  program
    .command("add-locale")
    .description("Add a language, seeded from the source catalog.")
    .argument("<code>", "locale code (e.g. de, pt-BR)")
    .action(async (code: string) => {
      const validation = validateLocale(code);
      if (!validation.ok) ui.fail(validation.message ?? "Invalid locale.");

      const project = await requireProject(process.cwd()).catch((error: Error) =>
        ui.fail(error.message),
      );
      const { root, config } = project;

      if (config.locales.includes(code)) {
        ui.fail(`"${code}" is already a locale in this project.`);
      }

      ui.intro(`jinn-web add-locale ${code}`);

      const sourceLocale = config.locales[0]!;
      const sourcePath = path.join(root, `src/i18n/messages/${sourceLocale}.ts`);
      const catalogPath = path.join(root, `src/i18n/messages/${code}.ts`);

      const nativeName =
        LOCALE_NATIVE_NAMES[code] ??
        (await ui.askText(undefined, {
          message: `What is "${code}" called in its own language?`,
          defaultValue: code.toUpperCase(),
        }));

      await ui.step(`Adding "${code}"`, async () => {
        // Seed from the source catalog with every string marked, so an
        // untranslated string is VISIBLE rather than silently in the source
        // language. TypeScript keeps it complete from here.
        const source = await fs.readFile(sourcePath, "utf8");
        await fs.outputFile(
          catalogPath,
          await formatSource(seedLocaleCatalog(source, code), catalogPath),
        );

        const tsProject = createProject();

        const locales = openFile(tsProject, path.join(root, "src/i18n/locales.ts"));
        const localesText = locales.getFullText();
        locales.replaceWithText(
          localesText
            .replace(
              /(export const SUPPORTED_LOCALES = \[)([^\]]*)(\])/,
              (_m, open: string, body: string, close: string) =>
                `${open}${body.trimEnd()}, "${code}"${close}`,
            )
            .replace(
              /(LOCALE_NAMES: Record<Locale, string> = \{)/,
              `$1\n  "${code}": "${nativeName}",`,
            ),
        );

        const index = openFile(tsProject, path.join(root, "src/i18n/index.ts"));
        const identifier = identifierFor(code);
        index.addImportDeclaration({
          moduleSpecifier: `./messages/${code}`,
          defaultImport: identifier,
        });
        addObjectProperty(index, "CATALOGS", `"${code}"`, identifier);

        await tsProject.save();

        for (const file of [
          path.join(root, "src/i18n/locales.ts"),
          path.join(root, "src/i18n/index.ts"),
        ]) {
          await fs.writeFile(
            file,
            await formatSource(await fs.readFile(file, "utf8"), file),
          );
        }

        await writeConfig(root, { ...config, locales: [...config.locales, code] });
      });

      ui.outro(
        [
          `${pc.green("+")} src/i18n/messages/${code}.ts ${pc.dim("(every string marked TODO)")}`,
          "",
          `  ${pc.dim("Translate, then:")} jinn-web doctor`,
        ].join("\n"),
      );
    });
}

function registerRename(program: Command): void {
  program
    .command("rename")
    .description("Change the project's package name and display name.")
    .option("-n, --name <name>", "new package name (kebab-case)")
    .option("-a, --app-name <name>", "new display name")
    .action(async (flags: { name?: string; appName?: string }) => {
      if (!flags.name && !flags.appName) {
        ui.fail("Pass --name, --app-name, or both.");
      }

      const project = await requireProject(process.cwd()).catch((error: Error) =>
        ui.fail(error.message),
      );
      ui.intro("jinn-web rename");

      const changed: string[] = [];

      if (flags.name) {
        const validation = validateName(flags.name, "project name");
        if (!validation.ok) ui.fail(validation.message ?? "Invalid name.");

        const pkgPath = path.join(project.root, "package.json");
        const pkg = (await fs.readJson(pkgPath)) as Record<string, unknown>;
        pkg.name = flags.name;
        await fs.writeJson(pkgPath, pkg, { spaces: 2 });
        changed.push(`package.json name → ${flags.name}`);
      }

      if (flags.appName) {
        // The display name lives in env, not in source — one value read by
        // metadata, the shell and the login screen alike.
        for (const file of [".env.local", ".env.example"]) {
          const target = path.join(project.root, file);
          if (!(await fs.pathExists(target))) continue;
          const source = await fs.readFile(target, "utf8");
          await fs.writeFile(
            target,
            source.replace(
              /^NEXT_PUBLIC_APP_NAME=.*$/m,
              `NEXT_PUBLIC_APP_NAME=${flags.appName}`,
            ),
          );
          changed.push(`${file} display name → ${flags.appName}`);
        }
      }

      ui.outro(changed.map((entry) => `${pc.green("✓")} ${entry}`).join("\n"));
    });
}
