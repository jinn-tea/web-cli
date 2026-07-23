"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { reportError } from "@/lib/reporting";

/**
 * Error boundary for the authed shell.
 *
 * A boundary catches for the segment it sits in and everything below it, so
 * with only `app/error.tsx` a crash inside one screen replaces the ENTIRE page
 * — sidebar, header, navigation and all — leaving the user with no way out but
 * the back button. This one sits inside `AppShell`, so the failure is scoped to
 * the content area and the rest of the app stays usable.
 *
 * The root boundary still exists for what this can't catch: the layout itself,
 * and anything that fails before this mounts.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { scope: "boundary", area: "app", digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[60svh] items-center justify-center p-6">
      <ErrorState error={error} onRetry={reset} />
    </div>
  );
}
