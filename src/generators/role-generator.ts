import { execa } from "execa";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import {
  addArrayElement,
  addObjectProperty,
  createProject,
  openFile,
  removeArrayElement,
  removeObjectProperty,
} from "../engine/codemods.js";
import { formatSource } from "../engine/format.js";
import { toPascal, toTitle } from "../engine/naming.js";
import { listDomains, writeConfig, type Project } from "../engine/project.js";
import { renderString, templatesRoot } from "../engine/template.js";
import { migrateToRoles, type MigrationResult } from "./migrate-to-roles.js";

/**
 * The `role` generator.
 *
 * Adding a role touches five places, and the reason the architecture puts every
 * role map in a `Record<Role, …>` is precisely so you can't miss the sixth: the
 * moment `ROLES` grows, every incomplete map and every `<RoleScreens>` becomes
 * a COMPILE ERROR. This generator does the mechanical part and then runs `tsc`
 * to turn those errors into a decision checklist.
 *
 * That inversion is the whole point — instead of hoping a developer remembers
 * which switch statements need a new case, the type system enumerates them.
 */

export interface RoleChecklistItem {
  file: string;
  line: number;
  message: string;
}

export interface AddRoleResult {
  role: string;
  created: string[];
  wired: string[];
  checklist: RoleChecklistItem[];
  /** Set when the project had no roles and was converted to role-first. */
  migration?: MigrationResult;
}

/** Where a role's dashboard surface lives. */
function dashboardPath(role: string): string {
  return `src/features/${role}/dashboard/components/${role}-dashboard.tsx`;
}

async function renderPart(file: string, vars: object): Promise<string> {
  const source = await fs.readFile(
    path.join(templatesRoot(), "parts", file),
    "utf8",
  );
  return renderString(source, vars);
}

/**
 * Run a whole-tree operation with rollback.
 *
 * Migration moves folders, rewrites imports across every file, and restores a
 * dozen others. A failure part-way through leaves folders moved and imports
 * half-repointed — a state that's hard to reason about and worse than not
 * having started. Snapshotting `src/` is blunt, but it's a few hundred KB of
 * text and it makes the operation genuinely atomic.
 *
 * Individual file writes elsewhere use the FileOp planner; this one is a
 * transaction because its unit of correctness is the whole tree.
 */
async function withTreeRollback<T>(
  root: string,
  run: () => Promise<T>,
): Promise<T> {
  const backup = await fs.mkdtemp(path.join(os.tmpdir(), "jinn-web-rollback-"));
  const backupSrc = path.join(backup, "src");
  const srcDir = path.join(root, "src");
  await fs.copy(srcDir, backupSrc);

  try {
    const result = await run();
    await fs.remove(backup);
    return result;
  } catch (error) {
    // Restore by RENAMING the broken tree aside first, then moving the backup
    // into place. Deleting `src` up front is what a first attempt did, and when
    // the delete then partially failed the move had nowhere to go — leaving no
    // tree at all. Renaming needs no permissions inside the tree, and nothing
    // is destroyed until the good copy is back.
    const aside = `${srcDir}.failed-${Date.now()}`;
    try {
      await fs.move(srcDir, aside);
      await fs.move(backupSrc, srcDir);
      await fs.remove(aside);
      await fs.remove(backup);
    } catch (rollbackError) {
      // NEVER swallow this. A failed rollback means their code is somewhere
      // other than where they left it, and they need to know exactly where.
      throw new Error(
        `Migration failed, and rolling back also failed.\n` +
          `  Original error: ${error instanceof Error ? error.message : String(error)}\n` +
          `  Rollback error: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}\n` +
          `  A copy of your src/ before the migration is at: ${backupSrc}\n` +
          `  Nothing there has been deleted — restore it by hand.`,
      );
    }
    throw error;
  }
}

export async function addRole(
  project: Project,
  role: string,
): Promise<AddRoleResult> {
  // Converting a roleless project rewrites the whole tree, so it runs as a
  // transaction. Adding a role to a project that already has them is a handful
  // of additive edits and doesn't need one.
  return project.config.roles.length === 0
    ? withTreeRollback(project.root, () => addRoleInner(project, role))
    : addRoleInner(project, role);
}

async function addRoleInner(
  project: Project,
  role: string,
): Promise<AddRoleResult> {
  const { root, config } = project;
  const created: string[] = [];
  const wired: string[] = [];

  const roles = [...config.roles, role];

  // A roleless project needs converting before the role can be added: restore
  // the role-shaped files, move existing features under common/, repoint their
  // imports. Without this, `--no-roles` would be a one-way door.
  const migration =
    config.roles.length === 0 ? await migrateToRoles(project, role) : undefined;

  const tsProject = createProject();
  const note = (changed: boolean, description: string) => {
    if (changed) wired.push(description);
  };

  // 1. The tuples and the maps keyed off them.
  const rolesFile = openFile(tsProject, path.join(root, "src/constants/roles.ts"));
  note(
    addArrayElement(rolesFile, "ROLES", `"${role}"`, (text) => text === `"${role}"`),
    `ROLES += "${role}"`,
  );
  note(
    addArrayElement(rolesFile, "ROLE_GROUPS", `"${role}"`, (text) => text === `"${role}"`),
    `ROLE_GROUPS += "${role}"`,
  );
  note(
    addObjectProperty(rolesFile, "ROLE_TO_GROUP", role, `"${role}"`),
    `ROLE_TO_GROUP.${role}`,
  );
  note(
    addObjectProperty(rolesFile, "ROLE_LABEL_KEYS", role, `"roles.${role}"`),
    `ROLE_LABEL_KEYS.${role}`,
  );

  // 2. A display name in every catalog.
  for (const [index, locale] of config.locales.entries()) {
    const catalogPath = path.join(root, `src/i18n/messages/${locale}.ts`);
    if (!(await fs.pathExists(catalogPath))) continue;

    const label = index === 0 ? toTitle(role) : `TODO(${locale}): ${toTitle(role)}`;
    // `roles` is a nested namespace inside the catalog, not a top-level key.
    note(
      await addNestedProperty(catalogPath, "roles", role, `"${label}"`),
      `i18n ${locale}.roles.${role}`,
    );
  }

  await tsProject.save();
  await formatFiles(tsProject.getSourceFiles().map((file) => file.getFilePath()));

  // 3. The role's folders and its dashboard surface.
  const vars = { roles, role, RoleName: toPascal(role), pascal: toPascal };

  // A migration has already written this role's dashboard and folders.
  if (migration) {
    created.push(`src/features/${role}/`);
  } else {
    const dashboard = dashboardPath(role);
    await fs.outputFile(
      path.join(root, dashboard),
      await formatSource(
        await renderPart("role-dashboard.tsx.eta", vars),
        path.join(root, dashboard),
      ),
    );
    created.push(dashboard);

    await fs.outputFile(
      path.join(root, `src/features/${role}/_shared/.gitkeep`),
      "",
    );
    created.push(`src/features/${role}/_shared/`);
  }

  // 4. Regenerate the dashboard page rather than patching it — going from one
  //    role to two changes its SHAPE (a direct render becomes `<RoleScreens>`),
  //    and rendering from the same template that `create` uses guarantees the
  //    two never diverge.
  const pagePath = "src/app/(app)/dashboard/page.tsx";
  await fs.outputFile(
    path.join(root, pagePath),
    await formatSource(
      await renderPart("dashboard-page.tsx.eta", vars),
      path.join(root, pagePath),
    ),
  );
  wired.push("dashboard page dispatch");

  // 5. Record it, so generators and doctor agree on what exists.
  await writeConfig(root, { ...config, roles });
  wired.push("jinn-web.config.json");

  return {
    role,
    created,
    wired,
    migration,
    checklist: await collectChecklist(root),
  };
}

export async function removeRole(
  project: Project,
  role: string,
): Promise<{ removed: string[]; blockedBy: string[] }> {
  const { root, config } = project;

  // Refuse while the role still owns domains: deleting them silently would
  // discard real code, and migrating them is a decision, not a default.
  //
  // `dashboard` doesn't count — this generator created it as the role's default
  // surface, so it's ours to remove. Blocking on it would make every role
  // permanently un-removable.
  const domains = (await listDomains(root, role)).filter(
    (domain) => domain !== "dashboard",
  );
  if (domains.length > 0) return { removed: [], blockedBy: domains };

  const roles = config.roles.filter((candidate) => candidate !== role);
  const removed: string[] = [];

  const tsProject = createProject();
  const rolesFile = openFile(tsProject, path.join(root, "src/constants/roles.ts"));

  if (removeArrayElement(rolesFile, "ROLES", (text) => text === `"${role}"`)) {
    removed.push("ROLES");
  }
  removeArrayElement(rolesFile, "ROLE_GROUPS", (text) => text === `"${role}"`);
  removeObjectProperty(rolesFile, "ROLE_TO_GROUP", role);
  removeObjectProperty(rolesFile, "ROLE_LABEL_KEYS", role);

  for (const locale of config.locales) {
    const catalogPath = path.join(root, `src/i18n/messages/${locale}.ts`);
    if (!(await fs.pathExists(catalogPath))) continue;
    await removeNestedProperty(catalogPath, "roles", role);
  }

  await tsProject.save();
  await formatFiles(tsProject.getSourceFiles().map((file) => file.getFilePath()));

  await fs.remove(path.join(root, `src/features/${role}`));
  removed.push(`src/features/${role}/`);

  const vars = { roles, pascal: toPascal };
  const pagePath = "src/app/(app)/dashboard/page.tsx";
  await fs.outputFile(
    path.join(root, pagePath),
    await formatSource(
      await renderPart("dashboard-page.tsx.eta", vars),
      path.join(root, pagePath),
    ),
  );
  removed.push("dashboard page dispatch");

  await writeConfig(root, { ...config, roles });
  await clearRouteTypeCache(root);

  return { removed, blockedBy: [] };
}

/**
 * Run the project's own typecheck and turn the failures into a checklist.
 *
 * After adding a role, every remaining error IS a decision the exhaustiveness
 * guards have surfaced — which map needs an entry, which dispatch needs a
 * screen. Handing those back as a todo list is more useful than a wall of
 * compiler output.
 */
async function collectChecklist(root: string): Promise<RoleChecklistItem[]> {
  const result = await execa("npx", ["tsc", "--noEmit", "--pretty", "false"], {
    cwd: root,
    reject: false,
  });

  const output = `${result.stdout}\n${result.stderr}`;
  const items: RoleChecklistItem[] = [];

  for (const line of output.split("\n")) {
    const match = /^(.+?)\((\d+),\d+\): error TS\d+: (.+)$/.exec(line.trim());
    if (!match) continue;
    items.push({
      file: match[1]!,
      line: Number(match[2]),
      message: match[3]!,
    });
  }
  return items;
}

/**
 * Drop Next's generated route-type cache.
 *
 * Next writes `.next/types/**` describing every page it has seen. After a page
 * is deleted those files still import it, so the very next `tsc --noEmit` fails
 * with "cannot find module .../page.js" — pointing at a build artifact rather
 * than at anything the user did. Removing the cache lets it regenerate.
 */
async function clearRouteTypeCache(root: string): Promise<void> {
  await fs.remove(path.join(root, ".next", "types"));
}

async function formatFiles(filePaths: string[]): Promise<void> {
  await Promise.all(
    filePaths.map(async (filePath) => {
      const source = await fs.readFile(filePath, "utf8");
      const formatted = await formatSource(source, filePath);
      if (formatted !== source) await fs.writeFile(filePath, formatted, "utf8");
    }),
  );
}

/**
 * Add/remove a key inside a NESTED namespace of a catalog (`roles: { … }`).
 *
 * Text-based rather than AST-based, unlike the rest of the codemods: reaching a
 * nested literal through ts-morph means walking property initializers by kind,
 * which is more machinery than one well-anchored replace deserves.
 *
 * Critically these operate on the FILE, not on a ts-morph SourceFile. Routing
 * them through `replaceWithText` normalizes the node's leading trivia, which
 * silently drops the blank line separating one namespace from the next — a
 * change nobody made, showing up in every later diff.
 */
async function addNestedProperty(
  filePath: string,
  parent: string,
  key: string,
  initializer: string,
): Promise<boolean> {
  const text = await fs.readFile(filePath, "utf8");
  // `[^\S\n]` is horizontal whitespace only; plain `\s` also matches newlines,
  // which would let these patterns run across lines.
  if (new RegExp(`${parent}:[^\\S\\n]*\\{[^}]*\\b${key}:`, "s").test(text)) {
    return false;
  }

  const updated = text.replace(
    new RegExp(`(${parent}:[^\\S\\n]*\\{)`),
    `$1\n    ${key}: ${initializer},`,
  );
  if (updated === text) return false;
  await fs.writeFile(filePath, await formatSource(updated, filePath), "utf8");
  return true;
}

async function removeNestedProperty(
  filePath: string,
  parent: string,
  key: string,
): Promise<boolean> {
  const text = await fs.readFile(filePath, "utf8");
  const updated = text.replace(
    new RegExp(
      `(${parent}:[^\\S\\n]*\\{[\\s\\S]*?)\\n[^\\S\\n]*${key}:[^\\n]*\\n`,
    ),
    "$1\n",
  );
  if (updated === text) return false;
  await fs.writeFile(filePath, await formatSource(updated, filePath), "utf8");
  return true;
}
