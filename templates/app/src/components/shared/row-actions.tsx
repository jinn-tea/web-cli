"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * The per-row action menu.
 *
 * One pattern for every table: a kebab trigger with an accessible name (an
 * icon-only button with no label is invisible to a screen reader), destructive
 * items visually separated and styled as destructive.
 *
 * `stopPropagation` matters — without it, opening the menu on a clickable row
 * also navigates to the detail page.
 */
export interface RowAction {
  label: string;
  onSelect: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  disabled?: boolean;
}

export function RowActions({
  actions,
  className,
}: {
  actions: RowAction[];
  className?: string;
}) {
  const t = useTranslations();
  if (actions.length === 0) return null;

  const destructive = actions.filter((action) => action.destructive);
  const regular = actions.filter((action) => !action.destructive);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-8", className)}
          aria-label={t("common.table.openMenu")}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {regular.map((action) => (
          <DropdownMenuItem
            key={action.label}
            disabled={action.disabled}
            onSelect={action.onSelect}
          >
            {action.icon ? (
              <action.icon className="size-4" aria-hidden="true" />
            ) : null}
            {action.label}
          </DropdownMenuItem>
        ))}

        {destructive.length && regular.length ? <DropdownMenuSeparator /> : null}

        {destructive.map((action) => (
          <DropdownMenuItem
            key={action.label}
            disabled={action.disabled}
            onSelect={action.onSelect}
            variant="destructive"
          >
            {action.icon ? (
              <action.icon className="size-4" aria-hidden="true" />
            ) : null}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
