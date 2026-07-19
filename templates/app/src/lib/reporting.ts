import { isAbortError, isApiError, isNetworkError } from "@/lib/http";

/**
 * Observability seam.
 *
 * Everything that wants to record an error or a diagnostic goes through here —
 * `error.tsx`, the HTTP transport, the React Query cache, mutation helpers. In
 * development it prints; in production it's a no-op until you wire a real
 * service, which is then a ONE-FILE change instead of a hunt through the app.
 *
 * This is the only module allowed to call `console` (the ESLint guardrails
 * enforce that everywhere else).
 */

const isDev = process.env.NODE_ENV === "development";

export interface ReportContext {
  /** Where it happened: "query" | "mutation" | "boundary" | a domain name. */
  scope?: string;
  [key: string]: unknown;
}

export function reportError(error: unknown, context?: ReportContext): void {
  // Aborts are normal (a superseded request) — never noise the logs with them.
  if (isAbortError(error)) return;

  if (isDev) {
    console.error("[report]", describeError(error), context ?? {});
    return;
  }

  // TODO(observability): forward to Sentry/Datadog here, e.g.
  // Sentry.captureException(error, { extra: context });
}

export function reportMessage(message: string, context?: ReportContext): void {
  if (isDev) {
    console.warn("[report]", message, context ?? {});
  }
}

/** A short, human-readable description used for logs and fallback copy. */
export function describeError(error: unknown): string {
  if (isApiError(error)) return `${error.statusCode}: ${error.message}`;
  if (isNetworkError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}
