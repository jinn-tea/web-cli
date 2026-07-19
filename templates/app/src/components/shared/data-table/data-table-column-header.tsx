"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n";
import { cn } from "@/lib/utils";
import { parseSort, toggleSort } from "./sorting";

/**
 * A sortable column header.
 *
 * Sorting is SERVER-DRIVEN and lives in the URL (`?sort=-createdAt`), so a
 * sorted view is shareable and survives a reload — and the table never sorts a
 * single page of results while pretending it sorted the whole set.
 */
export interface DataTableColumnHeaderProps {
  title: string;
  /** The field name this column sorts by. Omit to render a plain header. */
  sortKey?: string;
  /** Current sort value, e.g. `"-createdAt"`. */
  sort?: string;
  onSortChange?: (next: string) => void;
  className?: string;
  align?: "left" | "right";
}

export function DataTableColumnHeader({
  title,
  sortKey,
  sort = "",
  onSortChange,
  className,
  align = "left",
}: DataTableColumnHeaderProps) {
  const t = useTranslations();

  if (!sortKey || !onSortChange) {
    return <span className={cn("text-overline", className)}>{title}</span>;
  }

  const { field, direction } = parseSort(sort);
  const isActive = field === sortKey;
  const Icon = !isActive
    ? ChevronsUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSortChange(toggleSort(sort, sortKey))}
      aria-label={
        isActive && direction === "asc"
          ? t("common.table.sortDescending")
          : t("common.table.sortAscending")
      }
      className={cn(
        "text-overline data-[active=true]:text-foreground -ml-2 h-8 gap-1 px-2",
        align === "right" && "-mr-2 ml-0 flex-row-reverse",
        className,
      )}
      data-active={isActive}
    >
      {title}
      <Icon
        className={cn("size-3.5", isActive ? "opacity-100" : "opacity-50")}
        aria-hidden="true"
      />
    </Button>
  );
}
