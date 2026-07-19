import { getLocale } from "@/i18n/locale-store";

/**
 * ALL date and time formatting goes through this module.
 *
 * Never call `toLocaleDateString` / `Intl.DateTimeFormat` / hand-built
 * `${d}/${m}/${y}` strings at a call site: formats then drift screen to screen
 * and none of them follow the user's locale. If you need a format that isn't
 * here, ADD IT HERE FIRST, then use it.
 *
 * Everything is `Intl`-based and reads the active locale, so switching language
 * reformats dates with no extra work.
 */

type DateInput = Date | string | number;

function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function format(value: DateInput, options: Intl.DateTimeFormatOptions): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(getLocale(), options).format(date);
}

/** `12 Mar 2026` — the default for dates shown in tables and detail rows. */
export function formatDate(value: DateInput): string {
  return format(value, { day: "2-digit", month: "short", year: "numeric" });
}

/** `12 Mar 2026, 14:30` */
export function formatDateTime(value: DateInput): string {
  return format(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `14:30` */
export function formatTime(value: DateInput): string {
  return format(value, { hour: "2-digit", minute: "2-digit" });
}

/** `12 March 2026` — for headings and confirmations where clarity beats density. */
export function formatDateLong(value: DateInput): string {
  return format(value, { day: "numeric", month: "long", year: "numeric" });
}

/** `Thu, 12 Mar` — compact day context, e.g. schedule rows. */
export function formatWeekday(value: DateInput): string {
  return format(value, { weekday: "short", day: "2-digit", month: "short" });
}

/** `2026-03-12` — the wire format; never shown to users. */
export function formatApiDate(value: DateInput): string {
  const date = toDate(value);
  if (!date) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/** `3 days ago` / `in 2 hours` — for activity feeds and "last updated". */
export function formatRelative(value: DateInput): string {
  const date = toDate(value);
  if (!date) return "—";

  const diffMs = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat(getLocale(), {
    numeric: "auto",
  });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) {
      return formatter.format(Math.round(diffMs / ms), unit);
    }
  }
  return formatter.format(Math.round(diffMs / 1000), "second");
}

/** `12 Mar – 18 Mar 2026`, collapsing whatever the two dates share. */
export function formatDateRange(from: DateInput, to: DateInput): string {
  const start = toDate(from);
  const end = toDate(to);
  if (!start || !end) return "—";
  return new Intl.DateTimeFormat(getLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatRange(start, end);
}

/** True when the date falls on today (local time). */
export function isToday(value: DateInput): boolean {
  const date = toDate(value);
  if (!date) return false;
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}
