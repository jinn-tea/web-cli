import { TruncatedText } from "./truncated-text";
import { cn } from "@/lib/utils";

/**
 * Label/value rows for detail screens.
 *
 * Uses a real `<dl>` so the label↔value relationship survives for screen
 * readers, and truncates string values by default because detail pages are
 * exactly where 80-character customer data shows up.
 */
export interface DescriptionItem {
  label: string;
  /** A string is truncated automatically; pass a node for custom rendering. */
  value: React.ReactNode;
  /** Span both columns — for addresses and notes. */
  wide?: boolean;
}

export function DescriptionList({
  items,
  className,
}: {
  items: DescriptionItem[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_minmax(0,1fr)]",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "grid gap-1 sm:col-span-2 sm:grid-cols-subgrid",
            item.wide && "sm:grid-cols-1",
          )}
        >
          <dt className="text-label text-muted-foreground">{item.label}</dt>
          {/* min-w-0 so a long value truncates rather than widening the grid. */}
          <dd className="text-body min-w-0">
            {typeof item.value === "string" ? (
              <TruncatedText text={item.value} />
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
