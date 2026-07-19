"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LOCALE_NAMES,
  SUPPORTED_LOCALES,
  useLocale,
  useSetLocale,
  useTranslations,
} from "@/i18n";

/**
 * Language switcher. Hidden entirely when the app ships a single locale, so a
 * one-language deployment doesn't show a pointless control.
 *
 * Language names are shown in their OWN language (Deutsch, not German) — that's
 * the one string a user who can't read the current UI language must recognize.
 */
export function LanguageSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const setLocale = useSetLocale();

  if (SUPPORTED_LOCALES.length < 2) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.language")}>
          <Languages className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => setLocale(code)}
            aria-current={code === locale ? "true" : undefined}
            className={code === locale ? "font-medium" : undefined}
          >
            {LOCALE_NAMES[code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
