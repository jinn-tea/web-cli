import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The empty branch of an async surface.
 *
 * An empty state's job is to tell the user WHAT TO DO NEXT — an icon and the
 * word "Empty" is a dead end. Always pass a hint, and a CTA wherever the user
 * can actually create the missing thing.
 *
 * Distinguish "nothing exists yet" (first run — offer the CTA) from "nothing
 * matches your filters" (offer a way to clear them); they read very differently
 * to someone who just typed a search.
 */
export interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  /** Primary next step — a create button, or "Clear filters". */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  hint,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <div className="bg-muted text-muted-foreground mb-4 flex size-11 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="text-h4">{title}</p>
      {hint ? (
        <p className="text-body text-muted-foreground mt-1 max-w-sm">{hint}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
