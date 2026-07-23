import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from "@tanstack/react-query";
import { isAbortError, isApiError, isParseError } from "@/lib/http";
import { reportError } from "@/lib/reporting";

/**
 * One place for React Query behavior.
 *
 * `staleTime` above zero matters for server rendering: without it, a query
 * hydrated from the server would refetch immediately on mount and waste the
 * work the server already did.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        // Retrying a 4xx just delays the error the user needs to see.
        retry: (failureCount, error) => {
          if (isAbortError(error)) return false;
          if (isApiError(error) && error.statusCode < 500) return false;
          // A response that failed its schema will fail identically on retry —
          // the shape is wrong, not the connection.
          if (isParseError(error)) return false;
          return failureCount < 1;
        },
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Server: a FRESH client per request — a module-level singleton would leak one
 * user's cache into another's request.
 * Browser: one singleton, so navigations reuse the cache.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

/**
 * Clients already carrying a reporting subscriber.
 *
 * A WeakSet, not a boolean: the server makes a fresh client per request, and a
 * module-level flag would leave every request after the first unsubscribed.
 */
const reportingAttached = new WeakSet<QueryClient>();

/**
 * Surface unexpected query failures to the reporting seam (not the user).
 *
 * Idempotent on purpose. The browser client is a singleton while the call site
 * is a `useState` initializer, which React Strict Mode deliberately invokes
 * twice in development — so without this guard the same client collects two
 * subscribers and every failure is reported twice. That reads as a retry bug
 * in the logs, and it only reproduces in dev.
 */
export function attachQueryErrorReporting(client: QueryClient): void {
  if (reportingAttached.has(client)) return;
  reportingAttached.add(client);

  client.getQueryCache().subscribe((event) => {
    if (event.type === "updated" && event.query.state.status === "error") {
      const error = event.query.state.error;
      if (!isAbortError(error)) reportError(error, { scope: "query" });
    }
  });
}
