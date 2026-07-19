import { clientEnv } from "@/config/env";
import { getLocale } from "@/i18n/locale-store";
import { ApiError, NetworkError, isAbortError } from "./errors";
import { tokenStore } from "./token-store";
import type { ApiEnvelope } from "./types";

/**
 * HTTP client for the external backend.
 *
 * It owns every transport concern so no other layer has to:
 *  - prefix requests with `NEXT_PUBLIC_API_URL`
 *  - attach `Authorization: Bearer <access token>`
 *  - send `Accept-Language` so backend error messages arrive localized
 *  - unwrap the `{ statusCode, data, error }` envelope → return `data`, or throw `ApiError`
 *  - transparently refresh an expired access token on 401 (SINGLE-FLIGHT) and
 *    replay the original request exactly once
 *  - forward an `AbortSignal` so React Query can actually cancel superseded requests
 *
 * Refreshing is decoupled: `lib/auth/session.ts` registers HOW to refresh via
 * `setTokenRefresher`, so this module owns no endpoint strings and no auth policy.
 *
 * NEVER bypass this with a raw `fetch` — doing so loses all of the above.
 */

const BASE_URL = clientEnv.NEXT_PUBLIC_API_URL;

type Refresher = () => Promise<string>;

let refresher: Refresher | null = null;
let inFlightRefresh: Promise<string> | null = null;
let onSessionExpired: (() => void) | null = null;

/** Wire up token refreshing. Called once, at app start. */
export function setTokenRefresher(fn: Refresher): void {
  refresher = fn;
}

/** React to an unrecoverable 401 (clear session, redirect to login). */
export function setOnSessionExpired(fn: () => void): void {
  onSessionExpired = fn;
}

export interface RequestOptions {
  /** Attach the bearer token (default true). Public endpoints pass false. */
  auth?: boolean;
  /** Forward React Query's signal so a superseded request is aborted. */
  signal?: AbortSignal;
}

interface InternalOptions extends RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Guards against an infinite refresh → retry loop. */
  _retried?: boolean;
}

async function runRefresh(): Promise<string> {
  if (!refresher) throw new ApiError(401, "Session expired.");
  // Single-flight: concurrent 401s share one refresh call instead of stampeding.
  inFlightRefresh ??= refresher().finally(() => {
    inFlightRefresh = null;
  });
  const token = await inFlightRefresh;
  tokenStore.set(token);
  return token;
}

function buildHeaders(auth: boolean, isFormData: boolean): HeadersInit {
  const headers: Record<string, string> = {
    // CORS-safelisted, so it needs no preflight allowance.
    "Accept-Language": getLocale(),
  };
  // For FormData let the browser set Content-Type with its multipart boundary.
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options: InternalOptions): Promise<T> {
  const { method, body, auth = true, signal, _retried = false } = options;

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: buildHeaders(auth, isFormData),
      body: isFormData
        ? (body as FormData)
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new NetworkError();
  }

  const envelope = (await res
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;
  const failed = !res.ok || (envelope?.error ?? null) !== null;

  if (failed) {
    const statusCode = envelope?.statusCode ?? res.status;
    const message =
      envelope?.error?.message ?? res.statusText ?? "Request failed";

    // Access token expired → refresh once, then replay the original request.
    if (statusCode === 401 && auth && !_retried && refresher) {
      try {
        await runRefresh();
      } catch {
        tokenStore.clear();
        onSessionExpired?.();
        throw new ApiError(401, message, envelope?.error?.timestamp);
      }
      return request<T>(path, { ...options, _retried: true });
    }

    throw new ApiError(statusCode, message, envelope?.error?.timestamp);
  }

  return envelope?.data as T;
}

/** A binary response plus the filename the server suggested. */
export interface BlobResponse {
  blob: Blob;
  /** From `Content-Disposition`; null when the server didn't name it. */
  filename: string | null;
}

/** `filename="report.pdf"` → `report.pdf`. */
function filenameFrom(disposition: string | null): string | null {
  if (!disposition) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8?.[1]) return decodeURIComponent(utf8[1]);
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1] ?? null;
}

/**
 * Fetch a binary payload (PDF/CSV export).
 *
 * A separate path from `request` because these endpoints answer with the file
 * itself, NOT the envelope — feeding that through `request` would call
 * `res.json()` on a PDF, get `null`, see a 200, and silently resolve to
 * `undefined`. Errors still arrive as envelopes, so content type decides how to
 * read the response. Token injection and single-flight refresh behave
 * identically — which is exactly why this belongs in the transport rather than
 * as a raw `fetch` in a repository.
 */
async function requestBlob(
  path: string,
  options: InternalOptions,
): Promise<BlobResponse> {
  const { auth = true, signal, _retried = false } = options;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers: buildHeaders(auth, false),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new NetworkError();
  }

  const isJson = (res.headers.get("content-type") ?? "").includes(
    "application/json",
  );

  // Either an explicit failure, or JSON where a file was expected — which is
  // how a business error on a download endpoint arrives.
  if (!res.ok || isJson) {
    const envelope = (await res
      .json()
      .catch(() => null)) as ApiEnvelope<unknown> | null;
    const statusCode = envelope?.statusCode ?? res.status;
    const message =
      envelope?.error?.message ?? res.statusText ?? "Request failed";

    if (statusCode === 401 && auth && !_retried && refresher) {
      try {
        await runRefresh();
      } catch {
        tokenStore.clear();
        onSessionExpired?.();
        throw new ApiError(401, message, envelope?.error?.timestamp);
      }
      return requestBlob(path, { ...options, _retried: true });
    }
    throw new ApiError(statusCode, message, envelope?.error?.timestamp);
  }

  return {
    blob: await res.blob(),
    filename: filenameFrom(res.headers.get("content-disposition")),
  };
}

export const backendClient = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE", body }),
  /** GET a file rather than an envelope — see `requestBlob`. */
  getBlob: (path: string, opts?: RequestOptions) =>
    requestBlob(path, { ...opts, method: "GET" }),
};
