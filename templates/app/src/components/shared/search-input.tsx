"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Search box for list screens.
 *
 * Controlled by design: the value belongs in URL state (`useTableParams`), so
 * the typed text is instant and shareable while the DEBOUNCED value is what
 * reaches the query key.
 */
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: SearchInputProps) {
  const t = useTranslations();

  return (
    <div className={cn("relative", className)}>
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t("common.actions.search")}
        aria-label={placeholder ?? t("common.actions.search")}
        className="pr-8 pl-8"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("common.actions.clear")}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
