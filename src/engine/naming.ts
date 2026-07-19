/**
 * Name derivation and validation.
 *
 * Every generator derives its identifiers from ONE input through these helpers,
 * so a domain called `vehicle-types` reliably yields `VehicleTypes`,
 * `vehicleTypes`, `use-vehicle-types.ts` and `vehicleTypes` query keys without
 * each generator re-deriving (and disagreeing).
 */

/** Split any casing into lowercase words. */
function words(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s\-_./]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

/** `Vehicle Types` → `vehicle-types` (files, routes, npm package names). */
export function toKebab(value: string): string {
  return words(value).join("-");
}

/** `vehicle-types` → `VehicleTypes` (components, types). */
export function toPascal(value: string): string {
  return words(value)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/** `vehicle-types` → `vehicleTypes` (variables, object keys). */
export function toCamel(value: string): string {
  const pascal = toPascal(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** `vehicle-types` → `Vehicle Types` (fallback UI labels). */
export function toTitle(value: string): string {
  return words(value)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** `vehicle-types` → `VEHICLE_TYPES` (true constants). */
export function toConstant(value: string): string {
  return words(value).join("_").toUpperCase();
}

export interface ValidationResult {
  ok: boolean;
  /** Why it failed, phrased as advice rather than a regex dump. */
  message?: string;
}

const RESERVED_NAMES = new Set([
  "common",
  "shared",
  "app",
  "api",
  "lib",
  "src",
  "node_modules",
  "public",
]);

/** Project/domain/role names: lowercase kebab, starting with a letter. */
export function validateName(
  value: string,
  what = "name",
): ValidationResult {
  if (!value.trim()) return { ok: false, message: `The ${what} is required.` };
  if (!/^[a-z][a-z0-9-]*$/.test(value)) {
    return {
      ok: false,
      message: `A ${what} must be lowercase kebab-case, starting with a letter (e.g. "vehicle-types").`,
    };
  }
  if (value.endsWith("-")) {
    return { ok: false, message: `A ${what} can't end with a hyphen.` };
  }
  return { ok: true };
}

/** Role names additionally can't collide with structural folder names. */
export function validateRole(value: string): ValidationResult {
  const base = validateName(value, "role");
  if (!base.ok) return base;
  if (RESERVED_NAMES.has(value)) {
    return {
      ok: false,
      message:
        value === "common"
          ? `"common" is implicit — it always exists alongside your roles.`
          : `"${value}" is reserved by the project structure. Pick another role name.`,
    };
  }
  return { ok: true };
}

/** `#2563EB` — six-digit hex, with or without the leading hash. */
export function validateHex(value: string): ValidationResult {
  if (!/^#?[0-9a-fA-F]{6}$/.test(value)) {
    return {
      ok: false,
      message: `Use a six-digit hex color, e.g. "#2563EB".`,
    };
  }
  return { ok: true };
}

export function normalizeHex(value: string): string {
  const hex = value.startsWith("#") ? value : `#${value}`;
  return hex.toLowerCase();
}

/** BCP-47-ish: `en`, `pt-BR`. */
export function validateLocale(value: string): ValidationResult {
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(value)) {
    return {
      ok: false,
      message: `Use a locale code like "en" or "pt-BR".`,
    };
  }
  return { ok: true };
}

/** Split a comma-separated flag into trimmed, de-duplicated entries. */
export function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}
