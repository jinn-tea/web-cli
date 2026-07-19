import { describe, expect, it } from "vitest";
import { BRAND_STEPS, buildBrandRamp } from "./brand.js";

describe("buildBrandRamp", () => {
  it("produces every step", () => {
    const ramp = buildBrandRamp("#2563eb");
    for (const step of BRAND_STEPS) {
      expect(ramp.ramp[step]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("reproduces the brand color exactly at its anchor step", () => {
    // The whole point: a generated palette that renders the brand "close but
    // not quite" is worse than no generator.
    const ramp = buildBrandRamp("#2563eb");
    expect(ramp.ramp[ramp.anchorStep]).toBe("#2563eb");
  });

  it("always anchors at 600, whatever the input's lightness", () => {
    // globals.css maps --primary to brand-600, so anchoring anywhere else means
    // the app's primary colour isn't the brand colour.
    for (const hex of ["#2563eb", "#10b981", "#111827", "#fbbf24"]) {
      const ramp = buildBrandRamp(hex);
      expect(ramp.anchorStep).toBe(600);
      expect(ramp.ramp[600]).toBe(hex);
    }
  });

  it("gets lighter as the step number decreases", () => {
    const ramp = buildBrandRamp("#2563eb");
    const luminance = (hex: string) =>
      parseInt(hex.slice(1, 3), 16) +
      parseInt(hex.slice(3, 5), 16) +
      parseInt(hex.slice(5, 7), 16);

    for (let i = 1; i < BRAND_STEPS.length; i += 1) {
      const lighter = ramp.ramp[BRAND_STEPS[i - 1]!];
      const darker = ramp.ramp[BRAND_STEPS[i]!];
      expect(luminance(lighter)).toBeGreaterThan(luminance(darker));
    }
  });

  it("handles hues across the wheel without throwing", () => {
    for (const hex of ["#10b981", "#dc2626", "#f59e0b", "#8b5cf6", "#111827"]) {
      const ramp = buildBrandRamp(hex);
      expect(ramp.ramp[ramp.anchorStep]).toBe(hex);
    }
  });

  it("rejects a value that isn't a color", () => {
    expect(() => buildBrandRamp("not-a-color")).toThrow();
  });
});
