import { ZodError } from "zod";

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

/**
 * The response didn't match the schema the repository expected.
 *
 * This is the inbound counterpart to parsing request bodies before they leave.
 * `backendClient.get<Order>(…)` is a CLAIM about the response, not a check —
 * TypeScript erases it, so without this a renamed backend field becomes
 * `undefined` flowing into a component and surfaces as a crash in a date
 * formatter three layers away, with a stack trace pointing at the formatter.
 *
 * Failing here instead means the error names the endpoint and the exact field,
 * and it happens at the one place that knows both.
 */
export class ParseError extends Error {
  /** e.g. `GET /orders` — the request whose response failed. */
  readonly endpoint: string;
  /** One `field.path: reason` per problem the schema found. */
  readonly issues: readonly string[];

  constructor(endpoint: string, issues: readonly string[]) {
    super(`${endpoint} → ${issues.join("; ")}`);
    this.name = "ParseError";
    this.endpoint = endpoint;
    this.issues = issues;
  }
}

export function isParseError(error: unknown): error is ParseError {
  return error instanceof ParseError;
}

/**
 * Normalize whatever a `parse` callback threw into a `ParseError`.
 *
 * Zod's own `error.message` is a JSON dump of every issue — accurate but
 * unreadable in a toast or a log line. Flattening to `path: reason` is what
 * makes the failure actionable at a glance.
 */
export function toParseError(endpoint: string, error: unknown): ParseError {
  if (error instanceof ZodError) {
    return new ParseError(
      endpoint,
      error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
        return `${path}: ${issue.message}`;
      }),
    );
  }
  return new ParseError(endpoint, [
    error instanceof Error ? error.message : String(error),
  ]);
}
