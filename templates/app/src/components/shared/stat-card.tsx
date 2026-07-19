import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * A KPI tile.
 *
 * Two details that make these readable at a glance: the number uses
 * `text-metric` (tabular figures, so a row of tiles aligns), and the delta
 * pairs its color with an arrow — a red number alone isn't distinguishable for
 * everyone, and "down" isn't always bad.
 *
 * `invertDelta` handles metrics where a decrease is the good outcome (costs,
 * error rate, time-to-resolve).
 */
export interface StatCardProps {
  label: string;
  value: string | number;
  /** Period-over-period change as a ratio (0.12 = +12%). */
  delta?: number;
  /** True when a NEGATIVE delta should read as positive. */
  invertDelta?: boolean;
  hint?: string;
  icon?: LucideIcon;
  isLoading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  invertDelta = false,
  hint,
  icon: Icon,
  isLoading = false,
  className,
}: StatCardProps) {
  const isUp = (delta ?? 0) >= 0;
  const isGood = invertDelta ? !isUp : isUp;
  const DeltaIcon = isUp ? ArrowUp : ArrowDown;

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-overline truncate">{label}</span>
          {Icon ? (
            <Icon
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden="true"
            />
          ) : null}
        </div>

        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <span className="text-metric">{value}</span>
        )}

        {delta !== undefined && !isLoading ? (
          <span
            className={cn(
              "text-caption flex items-center gap-1",
              isGood
                ? "text-success-subtle-foreground"
                : "text-danger-subtle-foreground",
            )}
          >
            <DeltaIcon className="size-3" aria-hidden="true" />
            {formatPercent(Math.abs(delta))}
            {hint ? (
              <span className="text-muted-foreground">{hint}</span>
            ) : null}
          </span>
        ) : hint && !isLoading ? (
          <span className="text-caption text-muted-foreground">{hint}</span>
        ) : null}
      </CardContent>
    </Card>
  );
}
