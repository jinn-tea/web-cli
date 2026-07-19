import type { Project } from "../engine/project.js";

/**
 * A single health check.
 *
 * `doctor` exists because generated wiring can be broken by hand later: a route
 * constant deleted, a domain folder removed without unwiring it, an i18n key
 * that never got translated. The compiler catches some of that; these catch the
 * rest, which is otherwise only discovered by a user hitting a dead link.
 */
export interface Issue {
  /** Project-relative path. */
  file: string;
  line?: number;
  message: string;
  /** True when `doctor --fix` can repair it mechanically. */
  fixable: boolean;
  /** Advisory rather than a failure (doesn't affect the exit code). */
  warning?: boolean;
}

export interface CheckContext {
  project: Project;
  /** Absolute path helper. */
  abs: (relative: string) => string;
  /** Read a project file, or null when it doesn't exist. */
  read: (relative: string) => Promise<string | null>;
  /** Files under a project-relative directory, recursively. */
  walk: (relative: string, filter?: (path: string) => boolean) => Promise<string[]>;
}

export interface DoctorCheck {
  id: string;
  title: string;
  run: (context: CheckContext) => Promise<Issue[]>;
  /** Repair the fixable issues this check produced. Returns how many it fixed. */
  fix?: (context: CheckContext, issues: Issue[]) => Promise<number>;
}
