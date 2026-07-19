"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A row of selectable chips — the quick filter above a list.
 *
 * Uses real `<button>`s with `aria-pressed` so the selected state is announced;
 * a styled `<div>` here would be invisible to assistive tech and unreachable by
 * keyboard. Pairs with URL state so a filtered view stays shareable.
 */
export interface FilterChip {
  value: string;
  label: string;
  count?: number;
}

export interface FilterChipsProps {
  chips: readonly FilterChip[];
  value: string | readonly string[];
  onChange: (value: string) => void;
  className?: string;
}

export function FilterChips({
  chips,
  value,
  onChange,
  className,
}: FilterChipsProps) {
  const isSelected = (chipValue: string) =>
    Array.isArray(value) ? value.includes(chipValue) : value === chipValue;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chips.map((chip) => {
        const selected = isSelected(chip.value);
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(chip.value)}
            className={cn(
              "text-label focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors focus-visible:ring-2 focus-visible:outline-none",
              selected
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-card hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {selected ? (
              <Check className="size-3" aria-hidden="true" />
            ) : null}
            {chip.label}
            {chip.count !== undefined ? (
              <span
                className={cn(
                  "text-caption tabular-nums",
                  selected ? "opacity-80" : "text-muted-foreground",
                )}
              >
                {chip.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
