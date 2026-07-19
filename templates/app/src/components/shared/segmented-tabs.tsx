"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

/**
 * Segmented control for switching between views of the SAME data (list/board,
 * all/mine). For navigating to different content, use tabs or links instead —
 * a segmented control implies the surface stays put.
 *
 * Bind `value` to URL state so the chosen view survives a refresh and a share.
 */
export interface SegmentedOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SegmentedTabsProps {
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
  className?: string;
}

export function SegmentedTabs({
  options,
  value,
  onChange,
  className,
  ...aria
}: SegmentedTabsProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      // Radix emits "" when the active item is re-clicked; ignore that so the
      // control can never end up with nothing selected.
      onValueChange={(next) => next && onChange(next)}
      variant="outline"
      size="sm"
      className={cn("w-fit", className)}
      {...aria}
    >
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <ToggleGroupItem key={option.value} value={option.value}>
            {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
            {option.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
