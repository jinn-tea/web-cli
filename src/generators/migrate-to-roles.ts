import fs from "fs-extra";
import path from "node:path";
import { formatSource } from "../engine/format.js";
import { applyRoleFirst } from "../engine/role-blocks.js";
import { renderString, templatesRoot } from "../engine/template.js";
import { toPascal, toTitle } from "../engine/naming.js";
import { listDomains, type Project } from "../engine/project.js";

/**
 * Convert a ROLELESS project into a role-first one.
 *
 * This is what stops `--no-roles` being a one-way door. Without it people
 * provision roles "just in case", which is the exact anxiety the flag exists to
 * remove.
 *
 * Three moves:
 *  1. Restore the role-shaped versions of the dozen files that were generated
 *     without role code, by re-rendering them from the template.
 *  2. Move `features/<domain>/` under `features/common/` and rewrite imports —
 *     existing domains are shared by construction, since every user could reach
 *     them before.
 *  3. Add the new role's own folder and dashboard.
 *
 * What it deliberately does NOT do is rewrite service hooks to pass a role
 * group to their query keys. That signature changes, so the compiler flags
 * every call site — and `role` already reports compiler errors as a checklist.
 * A mechanical rewrite of files the user has edited is a worse trade than a
 * precise list of what to change.
 */

/** Files that carry role-conditional regions and must be restored. */
const ROLE_SHAPED_FILES = [
  "src/lib/auth/types.ts",
  "src/lib/auth/hooks.ts",
  "src/lib/auth/guards.tsx",
  "src/lib/auth/index.ts",
  "src/components/layout/sidebar-nav.tsx",
  "src/components/layout/user-menu.tsx",
  "src/components/shared/command-menu.tsx",
  "src/components/shared/index.ts",
  "src/constants/index.ts",
  "src/app/(app)/settings/page.tsx",
];

/** Files that only exist in a role-first project. */
const ROLE_ONLY_FILES = ["src/components/shared/role-screens.tsx"];

export interface MigrationResult {
  restored: string[];
  moved: string[];
  notes: string[];
}

export async function migrateToRoles(
  project: Project,
  newRole: string,
): Promise<MigrationResult> {
  const { root } = project;
  const appTemplate = path.join(templatesRoot(), "app");
  const restored: string[] = [];
  const moved: string[] = [];
  const notes: string[] = [];

  // 1. Restore role-shaped files from the template.
  //
  //    Safe for these specific files because they're infrastructure the
  //    generators own — nav-config is handled separately below precisely
  //    because it DOES accumulate the user's domains.
  for (const relative of [...ROLE_SHAPED_FILES, ...ROLE_ONLY_FILES]) {
    const source = path.join(appTemplate, relative);
    if (!(await fs.pathExists(source))) continue;

    const target = path.join(root, relative);
    const text = await fs.readFile(source, "utf8");
    await fs.outputFile(
      target,
      await formatSource(applyRoleFirst(text), target),
      "utf8",
    );
    restored.push(relative);
  }

  // 1b. `constants/roles.ts` doesn't exist in a roleless project, and the
  //     caller is about to edit it. Seed it with the incoming role — the maps
  //     it adds are what make the exhaustiveness guards work from here on.
  const rolesRelative = "src/constants/roles.ts";
  const rolesTemplate = await fs.readFile(
    path.join(templatesRoot(), "parts", "roles.ts.eta"),
    "utf8",
  );
  const rolesTarget = path.join(root, rolesRelative);
  await fs.outputFile(
    rolesTarget,
    await formatSource(
      renderString(rolesTemplate, { roles: [newRole] }),
      rolesTarget,
    ),
    "utf8",
  );
  restored.push(rolesRelative);

  // 1c. Catalogs need a `roles` namespace for the label keys to live in.
  for (const locale of project.config.locales) {
    const catalogPath = path.join(root, `src/i18n/messages/${locale}.ts`);
    if (!(await fs.pathExists(catalogPath))) continue;

    const catalog = await fs.readFile(catalogPath, "utf8");
    if (/^\s*roles:\s*\{/m.test(catalog)) continue;

    // Insert an empty namespace; the caller fills in this role's label.
    const withRoles = catalog.replace(
      /^(\s*)nav:\s*\{/m,
      "$1roles: {},\n\n$1nav: {",
    );
    await fs.outputFile(
      catalogPath,
      await formatSource(withRoles, catalogPath),
      "utf8",
    );
  }

  // 2. nav-config and query-keys BOTH accumulate the user's domains — one nav
  //    entry and one key factory per `domain` they've run. Restoring either
  //    from the template would silently delete all of that. They get targeted
  //    edits to the user's own file instead.
  const navRelative = "src/components/layout/nav-config.ts";
  const navTarget = path.join(root, navRelative);
  let nav = await fs.readFile(navTarget, "utf8");

  nav = nav.replace(
    'import { APP_ROUTES } from "@/constants";',
    'import { APP_ROUTES, type Role } from "@/constants";',
  );
  nav = nav.replace(
    /(\n\s*icon: LucideIcon;\n)\}/,
    '$1  roles: "all" | readonly Role[];\n}',
  );
  // Everyone could reach these before roles existed, so "all" preserves
  // exactly the behaviour the app already had.
  nav = nav.replace(
    /(\n(\s*)icon: \w+,\n)(\s*\},)/g,
    '$1$2roles: "all",\n$3',
  );
  // Match the FUNCTION only. Including a leading `/** … */` lets the pattern
  // start at the file's header comment and swallow the type and the array with
  // it — which produces a file referencing NavItem before it's declared.
  nav = nav.replace(
    /export function navItems\(\): readonly NavItem\[\] \{\n\s*return NAV_ITEMS;\n\}/,
    `export function navItemsForRole(role: Role | null): readonly NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter(
    (item) => item.roles === "all" || item.roles.includes(role),
  );
}`,
  );
  await fs.outputFile(navTarget, await formatSource(nav, navTarget), "utf8");
  restored.push(`${navRelative} (nav items preserved)`);

  // Query keys become role-scoped so one role's cache can't serve another's
  // rows — but only the factory changes; the user's entries stay.
  const keysRelative = "src/constants/query-keys.ts";
  const keysTarget = path.join(root, keysRelative);
  let keys = await fs.readFile(keysTarget, "utf8");
  keys = keys.replace(
    /^(import .*\n)/m,
    'import type { RoleGroup } from "./roles";\n$1',
  );
  if (!keys.includes("RoleGroup")) {
    keys = `import type { RoleGroup } from "./roles";\n\n${keys}`;
  }
  keys = keys
    .replace(
      /list: \(params\?: ListParams\) =>\s*\[\.\.\.all, "list", params \?\? \{\}\] as const,/,
      'list: (group: RoleGroup, params?: ListParams) =>\n      [...all, group, "list", params ?? {}] as const,',
    )
    .replace(
      /detail: \(id: string\) => \[\.\.\.all, "detail", id\] as const,/,
      'detail: (group: RoleGroup, id: string) =>\n      [...all, group, "detail", id] as const,',
    );
  await fs.outputFile(keysTarget, await formatSource(keys, keysTarget), "utf8");
  restored.push(`${keysRelative} (key factories preserved)`);

  // 3. Existing domains move under common/ — every user could already reach
  //    them, so they are shared by definition.
  const featuresDir = path.join(root, "src", "features");
  const domains = await listDomains(root, "");
  const topLevel = (
    await fs.readdir(featuresDir, { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);
  void domains;

  const commonDir = path.join(featuresDir, "common");
  await fs.ensureDir(commonDir);

  for (const domain of topLevel) {
    if (domain === "common") continue;
    await fs.move(path.join(featuresDir, domain), path.join(commonDir, domain));
    moved.push(`features/${domain} → features/common/${domain}`);
  }

  if (moved.length > 0) {
    await rewriteImports(path.join(root, "src"), topLevel);
  }

  // 4. The new role's folder and dashboard.
  const dashboardRelative = `src/features/${newRole}/dashboard/components/${newRole}-dashboard.tsx`;
  const dashboardTemplate = await fs.readFile(
    path.join(templatesRoot(), "parts", "role-dashboard.tsx.eta"),
    "utf8",
  );
  await fs.outputFile(
    path.join(root, dashboardRelative),
    await formatSource(
      renderString(dashboardTemplate, {
        role: newRole,
        RoleName: toPascal(newRole),
      }),
      path.join(root, dashboardRelative),
    ),
  );
  await fs.outputFile(
    path.join(root, `src/features/${newRole}/_shared/.gitkeep`),
    "",
  );

  notes.push(
    `Existing features moved to common/ — they were reachable by everyone, so every role keeps them.`,
    `Your old dashboard is now features/common/dashboard. The dispatch page points at the new role's dashboard instead, so reuse or delete it as you prefer — it wasn't touched.`,
    `Query keys are now role-scoped. The compiler will flag each service hook that needs a role group; see the checklist below.`,
    `Role labels seeded for "${toTitle(newRole)}" — translate them in the other catalogs.`,
  );

  return { restored, moved, notes };
}

/** Repoint `@/features/<domain>` at `@/features/common/<domain>`. */
async function rewriteImports(dir: string, domains: string[]): Promise<void> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await rewriteImports(target, domains);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;

    const source = await fs.readFile(target, "utf8");
    let updated = source;
    for (const domain of domains) {
      if (domain === "common") continue;
      updated = updated.replaceAll(
        `@/features/${domain}/`,
        `@/features/common/${domain}/`,
      );
    }
    if (updated !== source) await fs.writeFile(target, updated, "utf8");
  }
}
