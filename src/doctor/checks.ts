import path from "node:path";
import {
  addExportStar,
  addObjectProperty,
  createProject,
  openFile,
} from "../engine/codemods.js";
import { formatSource } from "../engine/format.js";
import { toCamel } from "../engine/naming.js";
import { allRoles, listDomains } from "../engine/project.js";
import type { CheckContext, DoctorCheck, Issue } from "./types.js";
import fs from "fs-extra";

/**
 * The checks.
 *
 * Each is deliberately narrow and names the exact file and symbol, because a
 * health report that says "something is wrong with routing" costs more time
 * than it saves.
 */

/** Extract the keys of `export const NAME = { … }` from source text. */
function objectKeys(source: string, name: string): string[] {
  const match = new RegExp(
    `export const ${name}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`,
    "m",
  ).exec(source);
  if (!match?.[1]) return [];
  return [...match[1].matchAll(/^\s{2}(\w+)\s*:/gm)].map((entry) => entry[1]!);
}

/**
 * Every dot-path leaf in a catalog object literal.
 *
 * A catalog only ever contains nested objects and string values, so the rule is
 * simply: `key: {` descends, anything else `key:` is a leaf.
 *
 * That "anything else" matters — an earlier version required the value to start
 * with a quote ON THE SAME LINE, and reported every long string Prettier had
 * wrapped (`notFoundHint:\n  "…"`) as a MISSING translation. A checker that
 * cries wolf is worse than no checker.
 */
function catalogKeys(source: string): Set<string> {
  const keys = new Set<string>();
  const stack: string[] = [];

  for (const raw of source.split("\n")) {
    const line = raw.trim();

    const open = /^(\w+):\s*\{$/.exec(line);
    if (open?.[1]) {
      stack.push(open[1]);
      continue;
    }
    if (line.startsWith("}")) {
      stack.pop();
      continue;
    }

    const leaf = /^(\w+):/.exec(line);
    if (leaf?.[1]) keys.add([...stack, leaf[1]].join("."));
  }
  return keys;
}

const routesCheck: DoctorCheck = {
  id: "routes",
  title: "Routes",
  async run({ read, walk }) {
    const issues: Issue[] = [];
    const routesSource = await read("src/constants/routes.ts");
    if (!routesSource) return issues;

    const declared = new Set(objectKeys(routesSource, "APP_ROUTES"));

    // Every page under the authed group should have a constant, so nothing is
    // reachable only by a hardcoded string.
    const pages = await walk("src/app/(app)", (file) => file.endsWith("page.tsx"));
    for (const page of pages) {
      const segment = path
        .dirname(page)
        .split(path.sep)
        .pop();
      if (!segment || segment.startsWith("[") || segment === "(app)") continue;

      const key = toCamel(segment);
      if (!declared.has(key)) {
        issues.push({
          file: page,
          message: `Page "/${segment}" has no APP_ROUTES entry — links to it would be hardcoded strings.`,
          fixable: true,
        });
      }
    }

    // …and every constant should have a page, or it's a dead link waiting to
    // be used.
    const pageSegments = new Set(
      pages
        .map((page) => path.dirname(page).split(path.sep).pop())
        .filter((segment): segment is string => Boolean(segment))
        .map(toCamel),
    );
    for (const key of declared) {
      if (!pageSegments.has(key)) {
        issues.push({
          file: "src/constants/routes.ts",
          message: `APP_ROUTES.${key} has no page — the route 404s.`,
          fixable: false,
        });
      }
    }

    return issues;
  },

  async fix(context, issues) {
    const fixable = issues.filter((issue) => issue.fixable);
    if (fixable.length === 0) return 0;

    const tsProject = createProject();
    const file = openFile(tsProject, context.abs("src/constants/routes.ts"));

    for (const issue of fixable) {
      const segment = /"\/([^"]+)"/.exec(issue.message)?.[1];
      if (!segment) continue;
      addObjectProperty(file, "APP_ROUTES", toCamel(segment), `"/${segment}"`);
    }

    await tsProject.save();
    const target = context.abs("src/constants/routes.ts");
    await fs.writeFile(
      target,
      await formatSource(await fs.readFile(target, "utf8"), target),
    );
    return fixable.length;
  },
};

const queryKeysCheck: DoctorCheck = {
  id: "query-keys",
  title: "Query keys",
  async run({ read, walk }) {
    const issues: Issue[] = [];

    const files = await walk("src/features", (file) => file.endsWith(".ts") || file.endsWith(".tsx"));
    for (const file of files) {
      const source = await read(file);
      if (!source) continue;

      source.split("\n").forEach((line, index) => {
        // An inline key silently opts out of cache sharing and invalidation,
        // and nothing fails loudly when it's typo'd.
        if (/queryKey:\s*\[/.test(line) && !line.includes("QUERY_KEYS")) {
          issues.push({
            file,
            line: index + 1,
            message: "Inline queryKey — use a QUERY_KEYS factory so invalidation reaches it.",
            fixable: false,
          });
        }
      });
    }
    return issues;
  },
};

const navCheck: DoctorCheck = {
  id: "nav",
  title: "Navigation",
  async run({ project, read }) {
    const issues: Issue[] = [];
    const navFile = "src/components/layout/nav-config.ts";
    const navSource = await read(navFile);
    const routesSource = await read("src/constants/routes.ts");
    if (!navSource || !routesSource) return issues;

    const declaredRoutes = new Set(objectKeys(routesSource, "APP_ROUTES"));
    const sourceLocale = project.config.locales[0];
    const catalog = sourceLocale
      ? await read(`src/i18n/messages/${sourceLocale}.ts`)
      : null;
    const keys = catalog ? catalogKeys(catalog) : null;

    for (const [, route] of navSource.matchAll(/href:\s*APP_ROUTES\.(\w+)/g)) {
      if (route && !declaredRoutes.has(route)) {
        issues.push({
          file: navFile,
          message: `Nav item points at APP_ROUTES.${route}, which doesn't exist.`,
          fixable: false,
        });
      }
    }

    for (const [, key] of navSource.matchAll(/labelKey:\s*"([^"]+)"/g)) {
      if (key && keys && !keys.has(key)) {
        issues.push({
          file: navFile,
          message: `Nav label "${key}" has no translation — the sidebar would render the raw key.`,
          fixable: false,
        });
      }
    }

    const roles = new Set(project.config.roles);
    for (const [, list] of navSource.matchAll(/roles:\s*\[([^\]]+)\]/g)) {
      for (const [, role] of (list ?? "").matchAll(/"([^"]+)"/g)) {
        if (role && !roles.has(role)) {
          issues.push({
            file: navFile,
            message: `Nav item is restricted to role "${role}", which isn't in ROLES.`,
            fixable: false,
          });
        }
      }
    }

    return issues;
  },
};

const apiIndexCheck: DoctorCheck = {
  id: "api-index",
  title: "Endpoint index",
  async run({ project, read }) {
    const issues: Issue[] = [];
    const indexSource = await read("src/api.ts");
    if (indexSource === null) return issues;

    for (const role of allRoles(project.config)) {
      for (const domain of await listDomains(project.root, role)) {
        const constantsPath = `src/features/${role}/${domain}/constants.ts`;
        if (!(await read(constantsPath))) continue;

        const specifier = `@/features/${role}/${domain}/constants`;
        if (!indexSource.includes(specifier)) {
          issues.push({
            file: "src/api.ts",
            // An index that's only mostly complete stops being trusted.
            message: `${role}/${domain} endpoints are missing from the index.`,
            fixable: true,
          });
        }
      }
    }
    return issues;
  },

  async fix(context, issues) {
    const fixable = issues.filter((issue) => issue.fixable);
    if (fixable.length === 0) return 0;

    const tsProject = createProject();
    const file = openFile(tsProject, context.abs("src/api.ts"));

    for (const issue of fixable) {
      const match = /^(\S+)\/(\S+) endpoints/.exec(issue.message);
      if (!match) continue;
      addExportStar(file, `@/features/${match[1]}/${match[2]}/constants`);
    }

    await tsProject.save();
    const target = context.abs("src/api.ts");
    await fs.writeFile(
      target,
      await formatSource(await fs.readFile(target, "utf8"), target),
    );
    return fixable.length;
  },
};

const i18nCheck: DoctorCheck = {
  id: "i18n",
  title: "Localization",
  async run({ project, read }) {
    const issues: Issue[] = [];
    const [sourceLocale, ...others] = project.config.locales;
    if (!sourceLocale) return issues;

    const sourceCatalog = await read(`src/i18n/messages/${sourceLocale}.ts`);
    if (!sourceCatalog) return issues;
    const sourceKeys = catalogKeys(sourceCatalog);

    for (const locale of others) {
      const file = `src/i18n/messages/${locale}.ts`;
      const catalog = await read(file);
      if (!catalog) {
        issues.push({
          file,
          message: `Catalog for "${locale}" is missing entirely.`,
          fixable: false,
        });
        continue;
      }

      // TypeScript already enforces this via `satisfies Messages`; the check
      // catches a catalog that lost its type annotation.
      const keys = catalogKeys(catalog);
      const missing = [...sourceKeys].filter((key) => !keys.has(key));
      if (missing.length > 0) {
        issues.push({
          file,
          message: `${missing.length} key(s) missing vs ${sourceLocale}: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}`,
          fixable: false,
        });
      }

      const todos = (catalog.match(/TODO\(/g) ?? []).length;
      if (todos > 0) {
        issues.push({
          file,
          message: `${todos} string(s) still marked TODO — they'll ship untranslated.`,
          fixable: false,
          warning: true,
        });
      }
    }

    return issues;
  },
};

/**
 * Blank out comments and string bodies, preserving every offset and newline.
 *
 * Necessary because the repository's own doc comment explains the rule by
 * quoting `backendClient.get<Order>(…)` — scanning raw source reports the
 * documentation as a violation. Offsets are preserved (characters become
 * spaces) so reported line numbers still point at real code.
 */
function blankNonCode(source: string): string {
  const out = source.split("");
  let mode: "code" | "line" | "block" | "single" | "double" | "template" =
    "code";

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]!;
    const next = source[i + 1];
    const blank = () => {
      if (char !== "\n") out[i] = " ";
    };

    if (mode === "code") {
      if (char === "/" && next === "/") mode = "line";
      else if (char === "/" && next === "*") mode = "block";
      else if (char === "'") mode = "single";
      else if (char === '"') mode = "double";
      else if (char === "`") mode = "template";
      else continue;
      blank();
      continue;
    }

    // Inside a non-code region: blank it, then look for the terminator.
    blank();
    if (mode === "line" && char === "\n") mode = "code";
    else if (mode === "block" && char === "/" && source[i - 1] === "*")
      mode = "code";
    else if (mode === "single" && char === "'" && source[i - 1] !== "\\")
      mode = "code";
    else if (mode === "double" && char === '"' && source[i - 1] !== "\\")
      mode = "code";
    else if (mode === "template" && char === "`" && source[i - 1] !== "\\")
      mode = "code";
  }

  return out.join("");
}

/**
 * Read the argument list of a call starting at `open` (the index of its `(`),
 * respecting nesting so a call containing an object or a template literal is
 * captured whole rather than cut at the first inner `)`.
 */
function callArguments(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return source.slice(open + 1);
}

/**
 * Repositories must validate what they RECEIVE, not just what they send.
 *
 * `backendClient.get<Order>(…)` is a claim TypeScript erases — nothing checks
 * that the response is an Order. When the backend renames a field it becomes
 * `undefined` inside a component, and the crash surfaces somewhere with no
 * connection to the endpoint that caused it. Passing `parse` moves that failure
 * to the boundary, where the message can name the endpoint and the field.
 *
 * `delete` is exempt: it answers with an empty envelope, so there's no shape to
 * check.
 */
const responseParsingCheck: DoctorCheck = {
  id: "response-parsing",
  title: "Response validation",
  async run({ read, walk }) {
    const issues: Issue[] = [];
    const repositories = await walk("src/features", (file) =>
      /\/api\/[^/]+\.repository\.ts$/.test(file),
    );

    for (const file of repositories) {
      const raw = await read(file);
      if (!raw) continue;
      const source = blankNonCode(raw);

      // `delete` and `getBlob` return nothing parseable.
      const calls = source.matchAll(
        /backendClient\.(get|post|put|patch)\s*(?:<[^>]*>)?\s*\(/g,
      );
      for (const call of calls) {
        const open = call.index + call[0].length - 1;
        if (callArguments(source, open).includes("parse:")) continue;

        issues.push({
          file,
          line: source.slice(0, call.index).split("\n").length,
          message: `backendClient.${call[1]} doesn't validate its response — pass \`{ parse: <schema>.parse }\` so a shape change fails here instead of inside a component.`,
          fixable: false,
        });
      }
    }

    return issues;
  },
};

export const CHECKS: DoctorCheck[] = [
  routesCheck,
  queryKeysCheck,
  navCheck,
  apiIndexCheck,
  responseParsingCheck,
  i18nCheck,
];
