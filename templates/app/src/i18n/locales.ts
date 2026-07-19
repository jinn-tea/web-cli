/**
 * Supported locales. The FIRST entry is the source locale — its catalog is the
 * single source of truth, and TypeScript forces every other catalog to match
 * its shape (see `messages/`).
 *
 * Add a locale with `jinn-web add-locale <code>` rather than by hand: the
 * generator clones the source catalog with `TODO(<code>):` markers so nothing
 * silently falls back to English.
 */
export const SUPPORTED_LOCALES = ["en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const SOURCE_LOCALE: Locale = SUPPORTED_LOCALES[0];

/** Native names for the language switcher — never translated. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
};

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
