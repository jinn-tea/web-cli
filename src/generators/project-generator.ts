import fs from "fs-extra";
import path from "node:path";
import { buildBrandRamp } from "../engine/brand.js";
import { commitFresh } from "../engine/fs-plan.js";
import { formatSource } from "../engine/format.js";
import { toKebab, toPascal, toTitle } from "../engine/naming.js";
import { CONFIG_FILE, type ProjectConfig } from "../engine/project.js";
import {
  renderString,
  renderTree,
  templatesRoot,
  type RenderedFile,
} from "../engine/template.js";
import {
  identifierFor,
  normalizeDashboardKeys,
  removeNamedImport,
  removeNamespace,
  removeNavItem,
  removeRegistryEntry,
  replaceBrandRamp,
  rewriteClaudeMd,
  rewritePackageJson,
  rewriteRolesNamespace,
  seedLocaleCatalog,
} from "../engine/transforms.js";
import { LOCALE_NATIVE_NAMES } from "../engine/locale-names.js";

/**
 * `create`'s engine.
 *
 * Strategy: copy the runnable template verbatim, then apply a small, explicit
 * set of substitutions. The template stays a real app (so it can be run, swept
 * and CI-verified), and everything project-specific is generated here, where
 * it's testable.
 *
 * Files that are FULLY generated come from `templates/parts/*.eta`; files that
 * need a surgical edit go through `engine/transforms`.
 */

export interface CreateOptions {
  targetDir: string;
  projectName: string;
  appName: string;
  description: string;
  roles: string[];
  locales: string[];
  brandHex: string;
  apiUrl: string;
  authMode: "bff" | "client";
  packageManager: ProjectConfig["packageManager"];
  cliVersion: string;
}

/** Template paths excluded from generated projects. */
function isExcluded(relativePath: string): boolean {
  const normalized = relativePath.split(path.sep).join("/");

  return (
    // The reference domain is a development fixture for the template repo, not
    // something a new project should inherit.
    normalized.startsWith("src/features/admin/orders") ||
    normalized.startsWith("src/features/admin/dashboard") ||
    normalized.startsWith("src/features/member/dashboard") ||
    normalized === "src/app/(app)/orders/page.tsx" ||
    // Regenerated per project.
    normalized === "src/app/(app)/dashboard/page.tsx" ||
    normalized === "src/constants/roles.ts" ||
    normalized === "src/i18n/locales.ts" ||
    normalized === "src/i18n/index.ts" ||
    normalized === ".env.example" ||
    normalized === "README.md" ||
    // Template-repo bookkeeping.
    normalized === "codeable.config.json" ||
    normalized === ".env.local" ||
    normalized.startsWith("src/constants/roles.test") ||
    normalized === "tsconfig.tsbuildinfo"
  );
}

export async function generateProject(options: CreateOptions): Promise<void> {
  const {
    targetDir,
    projectName,
    appName,
    description,
    roles,
    locales,
    brandHex,
    apiUrl,
    authMode,
    packageManager,
    cliVersion,
  } = options;

  const appTemplate = path.join(templatesRoot(), "app");
  const partsDir = path.join(templatesRoot(), "parts");
  const ramp = buildBrandRamp(brandHex);
  const sourceLocale = locales[0]!;

  const partVars = {
    projectName,
    appName,
    description,
    roles,
    locales,
    localeNames: Object.fromEntries(
      locales.map((locale) => [
        locale,
        LOCALE_NATIVE_NAMES[locale] ?? locale.toUpperCase(),
      ]),
    ),
    apiUrl,
    packageManager,
    brand: ramp,
    // Helpers templates can call.
    pascal: toPascal,
    ident: identifierFor,
  };

  // Rendered parts go through Prettier like everything else. Skipping it leaves
  // files that are valid but not canonical, so the first codemod to touch one
  // reformats it and the diff shows changes nobody made.
  const renderPart = async (
    file: string,
    target: string,
    vars: object = partVars,
  ) =>
    formatSource(
      renderString(await fs.readFile(path.join(partsDir, file), "utf8"), vars),
      target,
    );

  await commitFresh(targetDir, async (staging) => {
    // 1. Copy the template, minus the excluded paths.
    const files: RenderedFile[] = await renderTree(appTemplate, partVars, {
      exclude: isExcluded,
    });

    for (const file of files) {
      const destination = path.join(staging, file.relativePath);
      if (file.content === null) {
        await fs.copy(file.sourcePath, destination);
      } else {
        await fs.outputFile(destination, file.content, "utf8");
      }
    }

    // 2. Files that are fully generated.
    const write = async (relative: string, template: string, vars?: object) => {
      const target = path.join(staging, relative);
      await fs.outputFile(target, await renderPart(template, target, vars));
    };

    await write("src/constants/roles.ts", "roles.ts.eta");
    await write("src/i18n/locales.ts", "locales.ts.eta");
    await write("src/i18n/index.ts", "i18n-index.ts.eta");
    await write("src/app/(app)/dashboard/page.tsx", "dashboard-page.tsx.eta");
    await write(".env.example", "env.example.eta");
    await write("README.md", "README.md.eta");

    // Local env so `dev` works immediately after scaffolding.
    await write(".env.local", "env.example.eta");

    // 3. A dashboard surface per role.
    for (const role of roles) {
      await write(
        `src/features/${role}/dashboard/components/${toKebab(role)}-dashboard.tsx`,
        "role-dashboard.tsx.eta",
        { ...partVars, role, RoleName: toPascal(role) },
      );
      // The role-scoped shared tier exists from day one so the three-tier
      // placement rule has somewhere obvious to go.
      await fs.outputFile(
        path.join(staging, `src/features/${role}/_shared/.gitkeep`),
        "",
      );
    }

    // 4. Surgical edits to copied files.
    //
    // Each edit is re-formatted afterwards. Removing an entry can leave a file
    // valid but no longer canonical — deleting one name from a wrapped import
    // leaves the remaining three spread over five lines where Prettier would
    // put them on one. That's invisible until a codemod later reformats the
    // file and the diff shows changes nobody made.
    const editFile = async (
      relative: string,
      edit: (source: string) => string,
    ) => {
      const target = path.join(staging, relative);
      const source = await fs.readFile(target, "utf8");
      await fs.writeFile(target, await formatSource(edit(source), target), "utf8");
    };

    await editFile("package.json", (source) =>
      rewritePackageJson(source, { name: projectName, description }),
    );

    // The reference domain's files are excluded, so its wiring must go too —
    // a nav item pointing at a missing route with an untranslated label is a
    // compile error, not a cosmetic leftover.
    await editFile("src/components/layout/nav-config.ts", (source) => {
      let next = removeNavItem(source, "orders");
      next = removeNamedImport(next, "ShoppingCart");
      return next;
    });
    await editFile("src/constants/routes.ts", (source) =>
      removeRegistryEntry(source, "orders"),
    );
    await editFile("src/constants/query-keys.ts", (source) =>
      removeRegistryEntry(source, "orders"),
    );
    await editFile("src/app/globals.css", (source) =>
      replaceBrandRamp(source, ramp),
    );
    await editFile("CLAUDE.md", (source) =>
      rewriteClaudeMd(source, { appName, roles, locales }),
    );

    // The source catalog: swap in this project's roles, drop the reference
    // domain's strings, and collapse the per-role dashboard subtitles.
    const catalogPath = `src/i18n/messages/${sourceLocale}.ts`;
    if (sourceLocale !== "en") {
      await fs.move(
        path.join(staging, "src/i18n/messages/en.ts"),
        path.join(staging, catalogPath),
      );
    }
    await editFile(catalogPath, (source) => {
      let next = removeNamespace(source, "orders");
      next = rewriteRolesNamespace(next, roles, toTitle);
      next = normalizeDashboardKeys(next);
      return next;
    });

    // 5. Seed the non-source catalogs.
    const catalogSource = await fs.readFile(
      path.join(staging, catalogPath),
      "utf8",
    );
    for (const locale of locales.slice(1)) {
      const target = path.join(staging, `src/i18n/messages/${locale}.ts`);
      await fs.outputFile(
        target,
        // Seeded by string substitution, so format it into canonical shape.
        await formatSource(seedLocaleCatalog(catalogSource, locale), target),
      );
    }

    // 6. Record what this project was generated with.
    const config: ProjectConfig = {
      cliVersion,
      roles,
      locales,
      brand: ramp.hex,
      authMode,
      packageManager,
    };
    await fs.writeJson(path.join(staging, CONFIG_FILE), config, { spaces: 2 });

    // npm renames .gitignore inside published packages; restore it.
    const gitignoreSource = path.join(appTemplate, "gitignore");
    if (await fs.pathExists(gitignoreSource)) {
      await fs.copy(gitignoreSource, path.join(staging, ".gitignore"));
    }
  });
}
