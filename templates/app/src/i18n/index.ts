"use client";

import { useCallback } from "react";
import en from "./messages/en";
import { useLocaleStore } from "./locale-store";
import { SOURCE_LOCALE, type Locale } from "./locales";
import type { MessageKey, MessageVars, Messages } from "./types";

/**
 * Minimal, fully-typed i18n. No runtime dependency — the catalogs are plain
 * objects and `MessageKey` is derived from the source catalog, so an unknown
 * key or a missing translation is a TYPE error, not a runtime surprise.
 *
 * Usage:
 *   const t = useTranslations();
 *   t("auth.login.title")
 *   t("dashboard.welcome", { name: user.name })
 */

const CATALOGS: Record<Locale, Messages> = {
  en,
  // codeable-web:locales — `add-locale` registers new catalogs here.
};

function lookup(catalog: Messages, key: string): string | undefined {
  const value = key
    .split(".")
    .reduce<unknown>(
      (node, segment) =>
        typeof node === "object" && node !== null
          ? (node as Record<string, unknown>)[segment]
          : undefined,
      catalog,
    );
  return typeof value === "string" ? value : undefined;
}

function interpolate(message: string, vars?: MessageVars): string {
  if (!vars) return message;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: MessageVars,
): string {
  const message =
    lookup(CATALOGS[locale], key) ?? lookup(CATALOGS[SOURCE_LOCALE], key);
  // A missing key can only happen if a catalog was edited outside TypeScript;
  // showing the key beats showing nothing, and it's obvious in review.
  return interpolate(message ?? key, vars);
}

export type TranslateFn = (key: MessageKey, vars?: MessageVars) => string;

export function useTranslations(): TranslateFn {
  const locale = useLocaleStore((state) => state.locale);
  return useCallback(
    (key: MessageKey, vars?: MessageVars) => translate(locale, key, vars),
    [locale],
  );
}

export function useLocale(): Locale {
  return useLocaleStore((state) => state.locale);
}

export function useSetLocale(): (locale: Locale) => void {
  return useLocaleStore((state) => state.setLocale);
}

/**
 * Resolve a string that MAY be a message key — used by form error rendering,
 * where Zod messages are authored as i18n keys but a server may also return a
 * ready-made sentence. A non-key string passes through unchanged.
 */
export function useMessageResolver(): (value: string) => string {
  const locale = useLocaleStore((state) => state.locale);
  return useCallback(
    (value: string) =>
      lookup(CATALOGS[locale], value) ??
      lookup(CATALOGS[SOURCE_LOCALE], value) ??
      value,
    [locale],
  );
}

export { SUPPORTED_LOCALES, LOCALE_NAMES, type Locale } from "./locales";
export type { MessageKey, MessageVars, Messages } from "./types";
