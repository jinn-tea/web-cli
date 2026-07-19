/**
 * The single error type thrown by the backend client for any non-success
 * response (an HTTP error, or a `200` envelope carrying a non-null `error`).
 *
 * It carries the backend's `statusCode` and human-readable `message` so the UI
 * can branch on status (409 → already exists, 410 → expired, 422 → validation)
 * and show the real cause instead of "Something went wrong".
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly timestamp?: string;

  constructor(statusCode: number, message: string, timestamp?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.timestamp = timestamp;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Transport failure with no HTTP response (offline, DNS, CORS). */
export class NetworkError extends Error {
  constructor(message = "Network request failed. Please try again.") {
    super(message);
    this.name = "NetworkError";
  }
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/** True for an aborted request — never surface these as errors to the user. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
