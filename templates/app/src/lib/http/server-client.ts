import "server-only";

import { backendApiUrl } from "@/config/env";
import { ApiError, NetworkError } from "./errors";
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

export interface ServerRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Bearer token for authed calls. */
  accessToken?: string;
  /** Forwarded so the backend localizes its error messages. */
  acceptLanguage?: string;
  signal?: AbortSignal;
}

export async function serverRequest<T>(
  path: string,
  options: ServerRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    accessToken,
    acceptLanguage,
    signal,
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

  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || (envelope?.error ?? null) !== null) {
    throw new ApiError(
      envelope?.statusCode ?? res.status,
      envelope?.error?.message ?? res.statusText ?? "Request failed",
      envelope?.error?.timestamp,
    );
  }

  return envelope?.data as T;
}
