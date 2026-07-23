import fs from "fs-extra";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatSource } from "./format.js";
import { renderGuardrailConfig } from "./guardrails.js";
import { templatesRoot } from "./template.js";

describe("renderGuardrailConfig", () => {
  it("stops shared layers importing features", () => {
    const config = renderGuardrailConfig({
      roles: ["admin"],
      severity: "error",
      withQuery: false,
    });

    expect(config).toContain(`name: "jinn-web/boundaries:shared-layers"`);
    expect(config).toContain(`group: ["@/features/**"]`);
  });

  it("emits a zone per role, forbidding the others", () => {
    const config = renderGuardrailConfig({
      roles: ["admin", "member"],
      severity: "error",
      withQuery: false,
    });

    expect(config).toContain(`files: ["src/features/admin/**"]`);
    expect(config).toContain(`"@/features/member/*"`);
    expect(config).toContain(`files: ["src/features/member/**"]`);
    expect(config).toContain(`"@/features/admin/*"`);
  });

  it("still guards the shared layers when a project has no roles", () => {
    const config = renderGuardrailConfig({
      roles: [],
      severity: "error",
      withQuery: true,
    });

    expect(config).toContain(`name: "jinn-web/boundaries:shared-layers"`);
    expect(config).not.toContain("jinn-web/boundaries:common");
  });

  /**
   * The template ships its own copy so it can be linted on its own. A copy is
   * exactly how the boundary zones went missing from generated projects once
   * already: the config's header promised "shared layers never import
   * features" while only the renderer actually said it. Generated projects now
   * get this renderer's output, and this test is what keeps the template's copy
   * the same file rather than a lookalike that drifts.
   */
  it("matches the config the template ships", async () => {
    const target = path.join(templatesRoot(), "app", "eslint.config.mjs");
    const expected = await formatSource(
      renderGuardrailConfig({
        roles: ["admin", "member"],
        severity: "error",
        withQuery: true,
      }),
      target,
    );

    expect(await fs.readFile(target, "utf8")).toBe(expected);
  });
});
