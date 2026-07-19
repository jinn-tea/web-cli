import { getLocale } from "@/i18n/locale-store";

/**
 * Number, currency and string formatting. Same rule as `lib/datetime`: every
 * call site uses these helpers so formatting stays locale-aware and identical
 * across screens. Add new formats here rather than inline.
 *
 * Plurals belong in the i18n catalog (`t(key, { count })`), NOT here — string
 * concatenation can't express plural rules in most languages.
 */

/** `1,234.56` */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(getLocale(), options).format(value);
}

/** `€1,234.56` */
export function formatCurrency(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency,
  }).format(value);
}

/** `1.2K`, `3.4M` — for KPI tiles and counts where space is tight. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat(getLocale(), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** `12.5%` — pass the ratio (0.125), not the percentage. */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  return new Intl.NumberFormat(getLocale(), {
    style: "percent",
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

/** `2.4 MB` */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${formatNumber(value, { maximumFractionDigits: 1 })} ${units[exponent]}`;
}

/** `Ada Lovelace` → `AL`. Used by avatars. */
export function initials(name: string, max = 2): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** `in_progress` / `in-progress` → `In progress`. For fallback labels only —
 *  user-facing status text should come from an i18n key. */
export function humanize(value: string): string {
  const spaced = value.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Shorten to `max` characters on a word boundary, appending an ellipsis. */
export function truncateWords(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
