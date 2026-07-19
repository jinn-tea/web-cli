import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Layout-matching skeletons, one per surface shape.
 *
 * The rule everywhere in this app: a screen or section that's loading shows a
 * skeleton shaped like its final content — never a centered spinner. That keeps
 * the layout stable (no shift when data lands) and tells the user what's coming.
 * Spinners are only for inline, tiny actions like a pending button.
 */

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}

/** A row of KPI tiles. */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Label/value pairs, matching `DescriptionList`. */
export function DetailSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="contents">
          <Skeleton className="h-4 w-24" />
          <Skeleton
            className="h-4"
            style={{ width: `${[60, 80, 45, 70, 55][index % 5]}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/** Stacked form fields, matching the `components/form` field height. */
export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-28 self-end" />
    </div>
  );
}

/** A vertical list of rows with an avatar and two lines. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
