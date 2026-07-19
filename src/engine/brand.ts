import { converter, formatHex, type Oklch } from "culori";

/**
 * Generate a full `brand-50…950` ramp from a single hex color.
 *
 * Done in OKLCH rather than HSL because OKLCH is perceptually uniform: stepping
 * lightness produces evenly-spaced shades, where HSL bunches up in the yellows
 * and goes muddy in the blues. The hue is held constant and chroma is scaled so
 * the pale and dark ends don't look artificially saturated.
 *
 * The stop nearest the input is snapped back to the EXACT input hex — a brand
 * color that comes out "close but not quite" is worse than no generator at all.
 */

const toOklch = converter("oklch");

export const BRAND_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

export type BrandStep = (typeof BRAND_STEPS)[number];

/**
 * The brand ALWAYS becomes step 600.
 *
 * `globals.css` maps `--primary: var(--brand-600)`, so anchoring anywhere else
 * means the app's primary colour isn't the brand colour — which is the exact
 * "close but not quite" failure this generator exists to avoid. Picking the
 * nearest step by lightness (the obvious approach) does precisely that:
 * #2563EB lands on 700 and #10B981 on 500.
 *
 * So instead of a fixed ladder, the ramp is built AROUND the input: lighter
 * steps interpolate from it up to a near-white, darker steps down to a
 * near-black. Even spacing in OKLCH keeps the result perceptually uniform.
 */
const ANCHOR_STEP = 600 satisfies BrandStep;

/** Lightness the palette approaches at each extreme. */
const LIGHTEST = 0.975;
const DARKEST = 0.28;

const LIGHTER_STEPS = [50, 100, 200, 300, 400, 500] as const;
const DARKER_STEPS = [700, 800, 900, 950] as const;

export interface BrandRamp {
  /** The input color, normalized. */
  hex: string;
  /** Always 600 — see the note above. */
  anchorStep: BrandStep;
  ramp: Record<BrandStep, string>;
}

export function buildBrandRamp(inputHex: string): BrandRamp {
  const parsed = toOklch(inputHex) as Oklch | undefined;
  if (!parsed) {
    throw new Error(`"${inputHex}" is not a color I can parse.`);
  }

  const { l: inputL, c: inputC, h: hue = 0 } = parsed;
  const hex = inputHex.toLowerCase();
  const ramp = {} as Record<BrandStep, string>;

  const render = (lightness: number, chroma: number) =>
    formatHex({ mode: "oklch", l: lightness, c: chroma, h: hue })!;

  // Chroma tapers toward both ends: full chroma at step 50 looks radioactive,
  // and at 950 it stops reading as "almost black".
  const chromaFor = (lightness: number) => {
    const distance = Math.abs(lightness - inputL);
    return Math.min(inputC, inputC * Math.max(0.18, 1 - distance * 1.15));
  };

  // Lighter half: step 500 sits one increment above the brand, 50 nearly white.
  LIGHTER_STEPS.forEach((step, index) => {
    // index 0 (=50) is the lightest, index 5 (=500) is nearest the brand.
    const t = (index + 1) / (LIGHTER_STEPS.length + 1);
    const lightness = LIGHTEST + (inputL - LIGHTEST) * t;
    ramp[step] = render(lightness, chromaFor(lightness));
  });

  // Darker half, mirrored toward DARKEST.
  DARKER_STEPS.forEach((step, index) => {
    const t = (index + 1) / (DARKER_STEPS.length + 1);
    const lightness = inputL + (DARKEST - inputL) * t;
    ramp[step] = render(lightness, chromaFor(lightness));
  });

  // The brand itself, verbatim — never a re-encoded approximation.
  ramp[ANCHOR_STEP] = hex;

  return { hex, anchorStep: ANCHOR_STEP, ramp };
}

/** Render the ramp as CSS custom property declarations for `globals.css`. */
export function rampToCss(ramp: BrandRamp, indent = "  "): string {
  return BRAND_STEPS.map((step) => {
    const comment =
      step === ramp.anchorStep ? " /* PRIMARY — the brand color */" : "";
    return `${indent}--brand-${step}: ${ramp.ramp[step]};${comment}`;
  }).join("\n");
}
