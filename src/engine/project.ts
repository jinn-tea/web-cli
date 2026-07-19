import fs from "fs-extra";
import path from "node:path";

/**
 * Project detection and the CLI's own state file.
 *
 * `codeable.config.json` is what makes generators deterministic: roles, locales
 * and the CLI version are recorded rather than re-inferred from the filesystem
 * on every run. (The Flutter CLI has no equivalent and must re-discover state
 * each time, which is where its ambiguity comes from.)
 */

export const CONFIG_FILE = "codeable.config.json";

export interface ProjectConfig {
  $schema?: string;
  cliVersion: string;
  roles: string[];
  locales: string[];
  brand: string;
  authMode: "bff" | "client";
  packageManager: "npm" | "pnpm" | "yarn" | "bun";
}

export interface Project {
  root: string;
  config: ProjectConfig;
}

/** Walk up from `cwd` looking for a project this CLI generated. */
export async function findProjectRoot(cwd: string): Promise<string | null> {
  let current = path.resolve(cwd);

  while (true) {
    if (await fs.pathExists(path.join(current, CONFIG_FILE))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export async function readConfig(root: string): Promise<ProjectConfig> {
  return fs.readJson(path.join(root, CONFIG_FILE)) as Promise<ProjectConfig>;
}

export async function writeConfig(
  root: string,
  config: ProjectConfig,
): Promise<void> {
  await fs.writeJson(path.join(root, CONFIG_FILE), config, { spaces: 2 });
}

/**
 * Resolve the project a generator is running in, with an actionable error when
 * there isn't one — "cannot find module" style failures deep in a generator are
 * much harder to act on.
 */
export async function requireProject(cwd: string): Promise<Project> {
  const root = await findProjectRoot(cwd);
  if (!root) {
    throw new Error(
      `No ${CONFIG_FILE} found here or in any parent directory.\n` +
        `Run this inside a project created by codeable-web, or scaffold one with:\n` +
        `  codeable-web create <name>`,
    );
  }
  return { root, config: await readConfig(root) };
}

/** All roles including the implicit `common`. */
export function allRoles(config: ProjectConfig): string[] {
  return [...config.roles, "common"];
}

/** Domains present under a role, read from disk (the source of truth for these). */
export async function listDomains(
  root: string,
  role: string,
): Promise<string[]> {
  const dir = path.join(root, "src", "features", role);
  if (!(await fs.pathExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
}

/** Detect the package manager from the lockfile, defaulting to npm. */
export async function detectPackageManager(
  root: string,
): Promise<ProjectConfig["packageManager"]> {
  if (await fs.pathExists(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (await fs.pathExists(path.join(root, "yarn.lock"))) return "yarn";
  if (await fs.pathExists(path.join(root, "bun.lockb"))) return "bun";
  return "npm";
}
