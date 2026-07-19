/**
 * Role-conditional regions in the template.
 *
 * A roleless project isn't "one role, hidden" — it genuinely has no `Role` type,
 * no `RoleGroup`, no guards and no role segment in its folders. That means about
 * a dozen template files need a second shape.
 *
 * Rather than maintain two copies of each (which drift) or write a brittle
 * subtractive regex per file (which is what makes the Flutter CLI's codemods
 * fragile), the template MARKS the regions:
 *
 *   // jinn-web:role-only:start
 *   export function useCurrentRole(): Role | null { … }
 *   // jinn-web:role-only:end
 *
 *   // jinn-web:roleless:start
 *   // export function navItems(): readonly NavItem[] { return NAV_ITEMS; }
 *   // jinn-web:roleless:end
 *
 * `role-only` regions are dropped for a roleless project. `roleless` regions are
 * COMMENTED OUT in the template — so the template itself still compiles and can
 * be run and swept — and uncommented when generating a roleless project.
 *
 * One transform, applied uniformly, and every marked region documents itself to
 * the next reader.
 */

/**
 * Markers appear in two comment styles, because JSX has no line comments:
 * `// jinn-web:role-only:start` in code, `{/* jinn-web:role-only:start *\/}` in
 * markup. Both must be recognised or a marked JSX region silently survives into
 * a roleless project and fails to compile.
 */
const MARK = String.raw`(?:\/\/|\{\/\*)\s*jinn-web:`;
const END = String.raw`\s*(?:\*\/\})?`;

const ROLE_ONLY = new RegExp(
  `[ \\t]*${MARK}role-only:start${END}[\\s\\S]*?${MARK}role-only:end${END}[ \\t]*\\n?`,
  "g",
);
const ROLELESS_BLOCK = new RegExp(
  `[ \\t]*${MARK}roleless:start${END}[ \\t]*\\n([\\s\\S]*?)[ \\t]*${MARK}roleless:end${END}[ \\t]*\\n?`,
  "g",
);

/** Produce the ROLELESS shape: drop role-only regions, activate roleless ones. */
export function applyRoleless(source: string): string {
  return source
    .replace(ROLE_ONLY, "")
    .replace(ROLELESS_BLOCK, (_match, body: string) =>
      body
        .split("\n")
        .map((line) => line.replace(/^(\s*)\/\/ ?/, "$1"))
        .join("\n")
        // Keep the trailing newline the block consumed.
        .replace(/\n?$/, "\n"),
    );
}

/** Produce the ROLE-FIRST shape: keep role-only regions, drop roleless ones. */
export function applyRoleFirst(source: string): string {
  return source
    .replace(ROLELESS_BLOCK, "")
    .replace(
      new RegExp(`[ \\t]*${MARK}role-only:(?:start|end)${END}[ \\t]*\\n?`, "g"),
      "",
    );
}

/** True when a file has anything conditional in it. */
export function hasRoleBlocks(source: string): boolean {
  return source.includes("jinn-web:");
}
