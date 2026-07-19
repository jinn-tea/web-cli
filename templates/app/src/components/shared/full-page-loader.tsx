import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full-viewport spinner — for the SESSION-RESOLVING moment only (before the app
 * shell can be drawn at all).
 *
 * Do NOT reach for this as a screen's loading state: a section backed by a
 * query uses layout-matching skeletons, so content lands without shifting.
 */
export function FullPageLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex min-h-svh items-center justify-center", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
