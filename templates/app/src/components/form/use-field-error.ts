"use client";

import { useMessageResolver } from "@/i18n";

/**
 * Resolve a react-hook-form error into display text.
 *
 * Zod messages in this app are authored as **i18n keys** (`"validation.email"`),
 * so validation errors translate like every other string. A message that isn't
 * a key — a sentence the server returned — passes through untouched, which is
 * what lets both sources share one rendering path.
 */
export function useFieldError(message?: string): string | undefined {
  const resolve = useMessageResolver();
  return message ? resolve(message) : undefined;
}
