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
 * Markers appear in three comment styles, because no single one is valid
 * everywhere: `// jinn-web:role-only:start` in code, `{/* … *\/}` in JSX (which
 * has no line comments), and `<!-- … -->` in Markdown. All three must be
 * recognised or a marked region silently survives into a roleless project —
 * failing to compile in the JSX case, and quietly describing an architecture
 * the project doesn't have in the Markdown one.
 */
const MARK = String.raw`(?:\/\/|\{\/\*|<!--)\s*jinn-web:`;
const END = String.raw`\s*(?:\*\/\}|-->)?`;

const ROLE_ONLY = new RegExp(
  `[ \\t]*${MARK}role-only:start${END}[\\s\\S]*?${MARK}role-only:end${END}[ \\t]*\\n?`,
  "g",
);
const ROLELESS_BLOCK = new RegExp(
  `[ \\t]*${MARK}roleless:start${END}[ \\t]*\\n([\\s\\S]*?)[ \\t]*${MARK}roleless:end${END}[ \\t]*\\n?`,
  "g",
);

/**
 * Uncomment a roleless block's body.
 *
 * Code bodies are commented line by line (`// …`). Markdown has no line
 * comment, so a Markdown body is wrapped in ONE `<!-- … -->` block instead —
 * which means activating it is deleting the two fence lines, not stripping a
 * prefix from each line.
 */
function uncomment(body: string): string {
  const lines = body.split("\n");
  const first = lines.findIndex((line) => line.trim() !== "");
  const last = lines.findLastIndex((line) => line.trim() !== "");

  if (first !== -1 && lines[first]!.trim() === "<!--" && lines[last]!.trim() === "-->") {
    return lines.filter((_line, index) => index !== first && index !== last).join("\n");
  }

  return lines.map((line) => line.replace(/^(\s*)\/\/ ?/, "$1")).join("\n");
}

/** Produce the ROLELESS shape: drop role-only regions, activate roleless ones. */
export function applyRoleless(source: string): string {
  return source
    .replace(ROLE_ONLY, "")
    .replace(ROLELESS_BLOCK, (_match, body: string) =>
      // Keep the trailing newline the block consumed.
      uncomment(body).replace(/\n?$/, "\n"),
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
