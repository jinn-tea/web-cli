import fs from "fs-extra";
import path from "node:path";
import {
  addArrayElement,
  addCatalogNamespace,
  addExportStar,
  addNamedImport,
  addObjectProperty,
  createProject,
  openFile,
  removeArrayElement,
  removeCatalogNamespace,
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
  /** Title Case: "Vehicle Types". */
  titleName: string;
  role: string;
  isCommon: boolean;
}

export function deriveNames(input: string, role: string): DomainNames {
  const name = toKebab(input);
  return {
    name,
    Name: toPascal(name),
    camelName: toCamel(name),
    constantName: toConstant(name),
    Entity: toPascal(toSingular(name)),
    titleName: toTitle(name),
    role,
    isCommon: role === "common",
  };
}

/** Where each rendered template lands, relative to the project root. */
export function domainFilePaths(names: DomainNames) {
  const dir = `src/features/${names.role}/${names.name}`;
  return {
    dir,
    constants: `${dir}/constants.ts`,
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

function navItemText(names: DomainNames): string {
  const roles = names.isCommon ? `"all"` : `["${names.role}"]`;
  return `{
    href: APP_ROUTES.${names.camelName},
    labelKey: "${names.camelName}.title",
    icon: Package,
    roles: ${roles},
  }`;
}

export interface GenerateDomainResult {
  created: string[];
  wired: string[];
  skipped: string[];
}

export async function generateDomain(
  project: CodeableProject,
  names: DomainNames,
  options: { withPage: boolean } = { withPage: true },
): Promise<GenerateDomainResult> {
  const { root, config } = project;
  const paths = domainFilePaths(names);
  const created: string[] = [];
  const wired: string[] = [];
  const skipped: string[] = [];

  const vars = {
    ...names,
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
    addArrayElement(nav, "NAV_ITEMS", navItemText(names), (text) =>
      text.includes(`APP_ROUTES.${names.camelName}`),
    ),
    `nav item (${names.isCommon ? "all roles" : names.role})`,
  );

  const apiIndex = openFile(tsProject, path.join(root, "src/api.ts"));
  note(
    addExportStar(apiIndex, `@/features/${names.role}/${names.name}/constants`),
    "api.ts endpoint index",
  );

  // 3. Seed every locale catalog. Non-source catalogs get TODO markers so an
  //    untranslated string is visible rather than silently English.
  for (const [index, locale] of config.locales.entries()) {
    const catalogPath = path.join(root, `src/i18n/messages/${locale}.ts`);
    if (!(await fs.pathExists(catalogPath))) continue;

    const catalog = openFile(tsProject, catalogPath);
    const marker = index === 0 ? "" : `TODO(${locale}): `;
    note(
      addCatalogNamespace(catalog, names.camelName, catalogNamespace(names, marker)),
      `i18n ${locale}.${names.camelName}`,
    );
  }

  await tsProject.save();

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
    removeExportStar(apiIndex, `@/features/${names.role}/${names.name}/constants`),
    "api.ts endpoint index",
  );

  for (const locale of config.locales) {
    const catalogPath = path.join(root, `src/i18n/messages/${locale}.ts`);
    if (!(await fs.pathExists(catalogPath))) continue;
    const catalog = openFile(tsProject, catalogPath);
    note(removeCatalogNamespace(catalog, names.camelName), `i18n ${locale}`);
  }

  await tsProject.save();
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
