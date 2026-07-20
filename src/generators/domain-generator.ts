import fs from "fs-extra";
import path from "node:path";
import {
  addArrayElement,
  addExportStar,
  addNamedImport,
  addObjectProperty,
  createProject,
  openFile,
  removeArrayElement,
  removeExportStar,
  removeNamedImport,
  removeObjectProperty,
} from "../engine/codemods.js";
import { formatSource } from "../engine/format.js";
import { toCamel, toConstant, toKebab, toPascal, toSingular, toTitle } from "../engine/naming.js";
import type { Project as CodeableProject } from "../engine/project.js";
import { renderString, templatesRoot } from "../engine/template.js";

/**
 * The `domain` generator.
 *
 * Emitting files is the easy half — the half that matters is WIRING them, so a
 * generated domain is reachable the moment it exists. Four registries get an
 * entry (routes, query keys, nav, endpoint index) plus the i18n catalogs and
 * the App Router page.
 *
 * `remove` is the exact inverse. Both go through the codemod layer, so applying
 * and then removing restores the project byte for byte.
 */

export interface DomainNames {
  /** kebab, plural: "vehicle-types". */
  name: string;
  /** Pascal, plural: "VehicleTypes". */
  Name: string;
  /** camel, plural: "vehicleTypes". */
  camelName: string;
  /** UPPER_SNAKE: "VEHICLE_TYPES". */
  constantName: string;
  /** Pascal, singular: "VehicleType". */
  Entity: string;
  /** camel, singular: "vehicleType" — the model schema's variable name. */
  entityCamel: string;
  /** kebab, singular: "vehicle-type" — the model's FILE name. */
  entityName: string;
  /** Title Case: "Vehicle Types". */
  titleName: string;
  role: string;
  isCommon: boolean;
}

/** `features/admin/orders` with a role, `features/orders` without. */
export function featurePath(names: Pick<DomainNames, "role" | "name">): string {
  return names.role
    ? `features/${names.role}/${names.name}`
    : `features/${names.name}`;
}

export function deriveNames(input: string, role: string): DomainNames {
  const name = toKebab(input);
  return {
    name,
    Name: toPascal(name),
    camelName: toCamel(name),
    constantName: toConstant(name),
    Entity: toPascal(toSingular(name)),
    entityCamel: toCamel(toSingular(name)),
    entityName: toKebab(toSingular(name)),
    titleName: toTitle(name),
    role,
    isCommon: role === "common",
  };
}

/** Where each rendered template lands, relative to the project root. */
export function domainFilePaths(names: DomainNames) {
  const dir = names.role
    ? `src/features/${names.role}/${names.name}`
    : `src/features/${names.name}`;
  return {
    dir,
    constants: `${dir}/constants.ts`,
    model: `${dir}/models/${names.entityName}.model.ts`,
    types: `${dir}/types/index.ts`,
    schema: `${dir}/validations/${names.name}.schema.ts`,
    repository: `${dir}/api/${names.name}.repository.ts`,
    service: `${dir}/services/use-${names.name}.ts`,
    columns: `${dir}/components/${names.name}-columns.tsx`,
    formDialog: `${dir}/components/${names.name}-form-dialog.tsx`,
    screen: `${dir}/components/${names.name}-screen.tsx`,
    page: `src/app/(app)/${names.name}/page.tsx`,
  };
}

const TEMPLATE_BY_TARGET = {
  constants: "constants.ts.eta",
  model: "model.ts.eta",
  types: "types.ts.eta",
  schema: "schema.ts.eta",
  repository: "repository.ts.eta",
  service: "service.ts.eta",
  columns: "columns.tsx.eta",
  formDialog: "form-dialog.tsx.eta",
  screen: "screen.tsx.eta",
  page: "page.tsx.eta",
} as const;

/** The i18n namespace seeded for a new domain. */
function catalogNamespace(names: DomainNames, marker = ""): string {
  const s = (text: string) => `"${marker}${text}"`;
  return `{
    title: ${s(names.titleName)},
    subtitle: ${s(`Everything under ${names.titleName.toLowerCase()}.`)},
    create: ${s(`New ${names.Entity.toLowerCase()}`)},
    createTitle: ${s(`New ${names.Entity.toLowerCase()}`)},
    editTitle: ${s(`Edit ${names.Entity.toLowerCase()}`)},
    searchPlaceholder: ${s("Search by name")},
    empty: ${s(`No ${names.titleName.toLowerCase()} yet`)},
    emptyHint: ${s(`They'll appear here once the first one is added.`)},
    deleteTitle: ${s(`Delete this ${names.Entity.toLowerCase()}?`)},
    created: ${s(`${names.Entity} created`)},
    updated: ${s(`${names.Entity} updated`)},
    deleted: ${s(`${names.Entity} deleted`)},
    columns: {
      name: ${s("Name")},
      status: ${s("Status")},
      created: ${s("Created")},
    },
    status: {
      draft: ${s("Draft")},
      pending: ${s("Pending")},
      active: ${s("Active")},
      completed: ${s("Completed")},
      cancelled: ${s("Cancelled")},
    },
  }`;
}

function navItemText(names: DomainNames, hasRoles: boolean): string {
  // A roleless project's NavItem has no `roles` field at all — emitting one
  // would be a type error, not just noise.
  const roles = !hasRoles
    ? ""
    : `\n    roles: ${names.isCommon ? `"all"` : `["${names.role}"]`},`;

  return `{
    href: APP_ROUTES.${names.camelName},
    labelKey: "${names.camelName}.title",
    icon: Package,${roles}
  }`;
}

export interface GenerateDomainResult {
  created: string[];
  wired: string[];
  skipped: string[];
}

export interface GenerateDomainOptions {
  withPage: boolean;
  /**
   * The backend prefixes this resource per role (`/admin/orders`).
   *
   * Deliberately separate from whether the project HAS roles. Role-scoped query
   * keys exist to stop one role's cache serving another's rows, and are needed
   * whenever roles exist. Grouped ENDPOINTS are a fact about the backend's URLs,
   * and plenty of multi-role apps have neither.
   */
  groupedEndpoints: boolean;
}

export async function generateDomain(
  project: CodeableProject,
  names: DomainNames,
  options: GenerateDomainOptions = { withPage: true, groupedEndpoints: false },
): Promise<GenerateDomainResult> {
  const { root, config } = project;
  const paths = domainFilePaths(names);
  const created: string[] = [];
  const wired: string[] = [];
  const skipped: string[] = [];

  const vars = {
    ...names,
    hasRoles: config.roles.length > 0,
    groupedEndpoints: options.groupedEndpoints,
    featurePath: featurePath(names),
    // The query-key factory needs a concrete fallback group for the disabled
    // case; the project's first role is as good a default as any.
    firstRoleGroup: config.roles[0] ?? "admin",
  };

  // 1. Emit the domain's own files.
  for (const [target, template] of Object.entries(TEMPLATE_BY_TARGET)) {
    if (target === "page" && !options.withPage) continue;

    const relative = paths[target as keyof typeof TEMPLATE_BY_TARGET];
    const source = await fs.readFile(
      path.join(templatesRoot(), "domain", template),
      "utf8",
    );
    const rendered = await formatSource(
      renderString(source, vars),
      path.join(root, relative),
    );
    await fs.outputFile(path.join(root, relative), rendered, "utf8");
    created.push(relative);
  }

  // 2. Wire it into the shared registries.
  const tsProject = createProject();
  const note = (changed: boolean, description: string) =>
    (changed ? wired : skipped).push(description);

  const routes = openFile(tsProject, path.join(root, "src/constants/routes.ts"));
  note(
    addObjectProperty(routes, "APP_ROUTES", names.camelName, `"/${names.name}"`),
    `APP_ROUTES.${names.camelName} → /${names.name}`,
  );

  const queryKeys = openFile(
    tsProject,
    path.join(root, "src/constants/query-keys.ts"),
  );
  note(
    addObjectProperty(
      queryKeys,
      "QUERY_KEYS",
      names.camelName,
      `resourceKeys("${names.name}")`,
    ),
    `QUERY_KEYS.${names.camelName}`,
  );

  const nav = openFile(
    tsProject,
    path.join(root, "src/components/layout/nav-config.ts"),
  );
  addNamedImport(nav, "lucide-react", "Package");
  note(
    addArrayElement(nav, "NAV_ITEMS", navItemText(names, config.roles.length > 0), (text) =>
      text.includes(`APP_ROUTES.${names.camelName}`),
    ),
    `nav item${names.role ? ` (${names.isCommon ? "all roles" : names.role})` : ""}`,
  );

  const apiIndex = openFile(tsProject, path.join(root, "src/api.ts"));
  note(
    addExportStar(apiIndex, `@/${featurePath(names)}/constants`),
    "api.ts endpoint index",
  );

  await tsProject.save();

  // 3. Seed every locale catalog. Non-source catalogs get TODO markers so an
  //    untranslated string is visible rather than silently English.
  //
  //    Done as TEXT, deliberately: routing this through ts-morph reformats the
  //    whole catalog and drops the blank line between namespaces, so a later
  //    edit shows a change nobody made. The role generator takes the same path
  //    for the same reason.
  for (const [index, locale] of config.locales.entries()) {
    const catalogPath = path.join(root, `src/i18n/messages/${locale}.ts`);
    if (!(await fs.pathExists(catalogPath))) continue;

    const marker = index === 0 ? "" : `TODO(${locale}): `;
    note(
      await addTextNamespace(
        catalogPath,
        names.camelName,
        catalogNamespace(names, marker),
      ),
      `i18n ${locale}.${names.camelName}`,
    );
  }

  // ts-morph writes valid but not canonically-formatted TypeScript; Prettier
  // makes the diff minimal and keeps round-trips exact.
  await formatTouchedFiles(root, tsProject.getSourceFiles().map((f) => f.getFilePath()));

  return { created, wired, skipped };
}

export async function removeDomain(
  project: CodeableProject,
  names: DomainNames,
): Promise<{ deleted: string[]; unwired: string[] }> {
  const { root, config } = project;
  const paths = domainFilePaths(names);
  const deleted: string[] = [];
  const unwired: string[] = [];

  const tsProject = createProject();
  const note = (changed: boolean, description: string) => {
    if (changed) unwired.push(description);
  };

  const routes = openFile(tsProject, path.join(root, "src/constants/routes.ts"));
  note(
    removeObjectProperty(routes, "APP_ROUTES", names.camelName),
    `APP_ROUTES.${names.camelName}`,
  );

  const queryKeys = openFile(
    tsProject,
    path.join(root, "src/constants/query-keys.ts"),
  );
  note(
    removeObjectProperty(queryKeys, "QUERY_KEYS", names.camelName),
    `QUERY_KEYS.${names.camelName}`,
  );

  const nav = openFile(
    tsProject,
    path.join(root, "src/components/layout/nav-config.ts"),
  );
  note(
    removeArrayElement(nav, "NAV_ITEMS", (text) =>
      text.includes(`APP_ROUTES.${names.camelName}`),
    ),
    "nav item",
  );
  // Drop the icon import only if no other item still uses it.
  if (!nav.getFullText().includes("icon: Package")) {
    removeNamedImport(nav, "lucide-react", "Package");
  }

  const apiIndex = openFile(tsProject, path.join(root, "src/api.ts"));
  note(
    removeExportStar(apiIndex, `@/${featurePath(names)}/constants`),
    "api.ts endpoint index",
  );

  await tsProject.save();

  for (const locale of config.locales) {
    const catalogPath = path.join(root, `src/i18n/messages/${locale}.ts`);
    if (!(await fs.pathExists(catalogPath))) continue;
    note(
      await removeTextNamespace(catalogPath, names.camelName),
      `i18n ${locale}`,
    );
  }
  await formatTouchedFiles(root, tsProject.getSourceFiles().map((f) => f.getFilePath()));

  // 2. Delete the domain's files last, so a failure above leaves them intact.
  for (const relative of [paths.page, paths.dir]) {
    const absolute = path.join(root, relative);
    if (await fs.pathExists(absolute)) {
      await fs.remove(absolute);
      deleted.push(relative);
    }
  }

  // Clean up the now-empty route directory.
  const pageDir = path.dirname(path.join(root, paths.page));
  if (await fs.pathExists(pageDir)) {
    const remaining = await fs.readdir(pageDir);
    if (remaining.length === 0) await fs.remove(pageDir);
  }

  // Next caches generated route types that still import the deleted page, so
  // the next typecheck would otherwise fail pointing at a build artifact.
  await fs.remove(path.join(root, ".next", "types"));

  return { deleted, unwired };
}

async function formatTouchedFiles(
  root: string,
  filePaths: string[],
): Promise<void> {
  await Promise.all(
    filePaths.map(async (filePath) => {
      const source = await fs.readFile(filePath, "utf8");
      const formatted = await formatSource(source, filePath);
      if (formatted !== source) await fs.writeFile(filePath, formatted, "utf8");
    }),
  );
  void root;
}

/**
 * Add a top-level namespace to a message catalog, as text.
 *
 * Kept off ts-morph on purpose: its formatter rewrites the whole file and
 * collapses the blank line that separates one namespace from the next, so the
 * next edit reports a change nobody made. Inserted before the catalog's closing
 * brace, with a preceding blank line to match the file's existing rhythm.
 */
async function addTextNamespace(
  filePath: string,
  key: string,
  objectText: string,
): Promise<boolean> {
  const text = await fs.readFile(filePath, "utf8");
  if (new RegExp(`^  ${key}:`, "m").test(text)) return false;

  const closing = text.lastIndexOf("\n};");
  if (closing === -1) return false;

  const block = `\n\n  ${key}: ${objectText},`;
  const updated = text.slice(0, closing) + block + text.slice(closing);
  await fs.writeFile(filePath, await formatSource(updated, filePath), "utf8");
  return true;
}

/** Remove a top-level namespace, taking its preceding blank line with it. */
async function removeTextNamespace(
  filePath: string,
  key: string,
): Promise<boolean> {
  const text = await fs.readFile(filePath, "utf8");
  const start = new RegExp(`\n\n?  ${key}: \\{`).exec(text);
  if (!start) return false;

  // Walk braces to find the namespace's end — a regex can't match nesting.
  let depth = 0;
  let index = text.indexOf("{", start.index);
  for (; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    else if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  let end = index + 1;
  if (text[end] === ",") end += 1;

  const updated = text.slice(0, start.index) + text.slice(end);
  await fs.writeFile(filePath, await formatSource(updated, filePath), "utf8");
  return true;
}
