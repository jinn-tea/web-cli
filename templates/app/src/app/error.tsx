"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { reportError } from "@/lib/reporting";

/**
 * Route-level error boundary. Must be a Client Component, and must offer a way
 * out — `reset()` re-renders the segment without a full page reload.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { scope: "boundary", digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <ErrorState error={error} onRetry={reset} />
    </div>
  );
}
