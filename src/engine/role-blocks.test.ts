import { describe, expect, it } from "vitest";
import { applyRoleFirst, applyRoleless, hasRoleBlocks } from "./role-blocks.js";

const code = [
  "// jinn-web:role-only:start",
  'import { ROLES } from "@/constants";',
  "// jinn-web:role-only:end",
  "// jinn-web:roleless:start",
  "// const roles = [];",
  "// jinn-web:roleless:end",
  "export const done = true;",
].join("\n");

const markdown = [
  "<!-- jinn-web:role-only:start -->",
  "2. **Role-first, then domain.** `src/features/<role>/<domain>/`.",
  "<!-- jinn-web:role-only:end -->",
  "<!-- jinn-web:roleless:start -->",
  "<!--",
  "2. **Domain-first.** `src/features/<domain>/`.",
  "-->",
  "<!-- jinn-web:roleless:end -->",
  "",
  "Shared text.",
].join("\n");

describe("role blocks", () => {
  it("keeps the role shape and drops the roleless one", () => {
    const result = applyRoleFirst(code);
    expect(result).toContain('import { ROLES } from "@/constants";');
    expect(result).not.toContain("const roles = []");
    expect(result).not.toContain("jinn-web:");
  });

  it("drops the role shape and uncomments the roleless one", () => {
    const result = applyRoleless(code);
    expect(result).not.toContain("ROLES");
    expect(result).toContain("const roles = [];");
    expect(result).not.toContain("//");
  });

  /**
   * Markdown has no line comment, so a roleless prose block is wrapped in one
   * `<!-- … -->` fence instead of being prefixed line by line. Without this,
   * the architecture guide shipped to a roleless project described role-first
   * folders that don't exist — which is worse than no guide, because anyone
   * following it builds the wrong structure.
   */
  it("resolves Markdown regions to the role shape", () => {
    const result = applyRoleFirst(markdown);
    expect(result).toContain("**Role-first, then domain.**");
    expect(result).not.toContain("**Domain-first.**");
    expect(result).not.toContain("jinn-web:");
    expect(result).toContain("Shared text.");
  });

  it("resolves Markdown regions to the roleless shape, unwrapping the fence", () => {
    const result = applyRoleless(markdown);
    expect(result).toContain("**Domain-first.** `src/features/<domain>/`.");
    expect(result).not.toContain("**Role-first");
    expect(result).not.toContain("<!--");
    expect(result).not.toContain("-->");
    expect(result).toContain("Shared text.");
  });

  it("recognises a file with anything conditional in it", () => {
    expect(hasRoleBlocks(markdown)).toBe(true);
    expect(hasRoleBlocks("plain text")).toBe(false);
  });
});
