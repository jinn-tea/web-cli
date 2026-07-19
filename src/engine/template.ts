import { Eta } from "eta";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BrandRamp } from "./brand.js";

/**
 * Template rendering.
 *
 * Templates are REAL FILES under `templates/`, not string constants in source:
 * they stay syntax-highlighted, lintable, and — critically — the whole rendered
 * tree can be type-checked in CI, so a template can't silently rot.
 *
 * Eta with EJS-style delimiters (`<%= it.x %>`) rather than mustache `{{ }}`,
 * because `{{` collides with JSX (`style={{ … }}`) and would corrupt output.
 *
 * Files ending in `.eta` are rendered and lose the suffix; everything else is
 * copied byte-for-byte (images, lockfiles, anything binary).
 */

const eta = new Eta({
  // Templates are ours, not user input — autoescaping would mangle the code
  // we're generating (quotes, angle brackets, ampersands).
  autoEscape: false,
  useWith: false,
  rmWhitespace: false,
});

/** Variables every app-template file may use. */
export interface AppTemplateVars {
  /** kebab-case, e.g. "my-app" — package name, directory. */
  projectName: string;
  /** Display name, e.g. "My App". */
  appName: string;
  description: string;
  /** Roles excluding the implicit "common". */
  roles: readonly string[];
  /** Locale codes; the first is the source catalog. */
  locales: readonly string[];
  brand: BrandRamp;
  apiUrl: string;
  authMode: "bff" | "client";
  cliVersion: string;
}

/** Variables available to domain-generator templates. */
export interface DomainTemplateVars {
  /** kebab, e.g. "vehicle-types". */
  name: string;
  /** PascalCase, e.g. "VehicleTypes". */
  Name: string;
  /** camelCase, e.g. "vehicleTypes". */
  camelName: string;
  /** Title Case fallback label, e.g. "Vehicle Types". */
  titleName: string;
  /** Singular Pascal entity name, e.g. "VehicleType". */
  Entity: string;
  role: string;
  /** True when the role is "common". */
  isCommon: boolean;
}

/**
 * Root of the bundled `templates/` directory.
 *
 * Walks up from this module looking for the package root rather than assuming a
 * fixed depth: the same code runs from `dist/cli.js` (bundled, one level down)
 * and from `src/engine/template.ts` (two levels down) during development, and a
 * hardcoded `../..` silently resolves outside the package in one of them.
 */
export function templatesRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));

  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(dir, "templates");
    if (fs.existsSync(path.join(candidate, "app"))) return candidate;

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    "Could not locate the bundled templates/ directory. " +
      "This usually means the package was published without it — check the `files` allowlist.",
  );
}

export function renderString(template: string, vars: object): string {
  return eta.renderString(template, vars);
}

export interface RenderedFile {
  /** Path relative to the tree root, with `.eta` stripped. */
  relativePath: string;
  /** Rendered text, or null when the file should be copied verbatim. */
  content: string | null;
  /** Absolute source path — set for verbatim copies. */
  sourcePath: string;
}

export interface RenderTreeOptions {
  /** Skip paths (relative to the tree root) — node_modules, build output. */
  exclude?: (relativePath: string) => boolean;
  /** Rewrite a destination path, e.g. to drop or rename a segment. */
  rewritePath?: (relativePath: string) => string | null;
}

const ALWAYS_EXCLUDED = new Set([
  "node_modules",
  ".next",
  "dist",
  "test-results",
  "playwright-report",
  ".turbo",
  ".git",
]);

/**
 * Walk a template directory and produce the rendered file list.
 *
 * Returns a plan rather than writing, so callers can dry-run it and so `create`
 * can stage everything before committing.
 */
export async function renderTree(
  treeDir: string,
  vars: object,
  options: RenderTreeOptions = {},
): Promise<RenderedFile[]> {
  const files: RenderedFile[] = [];

  async function walk(currentDir: string, relativeDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (ALWAYS_EXCLUDED.has(entry.name)) continue;

      const absolute = path.join(currentDir, entry.name);
      const relative = relativeDir ? path.join(relativeDir, entry.name) : entry.name;

      if (options.exclude?.(relative)) continue;

      if (entry.isDirectory()) {
        await walk(absolute, relative);
        continue;
      }

      const rewritten = options.rewritePath
        ? options.rewritePath(relative)
        : relative;
      if (rewritten === null) continue;

      if (entry.name.endsWith(".eta")) {
        const source = await fs.readFile(absolute, "utf8");
        files.push({
          relativePath: rewritten.replace(/\.eta$/, ""),
          content: renderString(source, vars),
          sourcePath: absolute,
        });
      } else {
        files.push({
          relativePath: rewritten,
          content: null,
          sourcePath: absolute,
        });
      }
    }
  }

  await walk(treeDir, "");
  return files;
}
