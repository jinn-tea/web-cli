import "server-only";

import { backendApiUrl } from "@/config/env";
import { ApiError, NetworkError, toParseError } from "./errors";
import type { ApiEnvelope } from "./types";

/**
 * Server-side twin of `backendClient`, for Route Handlers and Server Components.
 *
 * It exists because the browser client reads the in-memory `tokenStore`, which
 * has no meaning on the server: here the caller passes the access token
 * explicitly (obtained from the session cookie exchange).
 *
 * `import "server-only"` makes importing this from a Client Component a BUILD
 * error rather than a runtime surprise.
 */

export interface ServerRequestOptions<T = unknown> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Bearer token for authed calls. */
  accessToken?: string;
  /** Forwarded so the backend localizes its error messages. */
  acceptLanguage?: string;
  signal?: AbortSignal;
  /**
   * Validate the response — see `RequestOptions.parse` on the browser client.
   * Kept in step deliberately: a Route Handler that skipped validation would be
   * an unchecked way into the same data the browser client guards.
   */
  parse?: (data: unknown) => T;
}

export async function serverRequest<T>(
  path: string,
  options: ServerRequestOptions<T> = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    accessToken,
    acceptLanguage,
    signal,
    parse,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (acceptLanguage) headers["Accept-Language"] = acceptLanguage;

  let res: Response;
  try {
    res = await fetch(`${backendApiUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      // Auth calls must never be cached by the Next data cache.
      cache: "no-store",
    });
  } catch {
    throw new NetworkError();
  }

  const envelope = (await res
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || (envelope?.error ?? null) !== null) {
    throw new ApiError(
      envelope?.statusCode ?? res.status,
      envelope?.error?.message ?? res.statusText ?? "Request failed",
      envelope?.error?.timestamp,
    );
  }

  if (parse) {
    try {
      return parse(envelope?.data);
    } catch (error) {
      throw toParseError(`${method} ${path}`, error);
    }
  }

  return envelope?.data as T;
}
