import { z } from "zod";

/**
 * Typed, validated environment variables.
 *
 * Server-only vars live in `serverEnv`; anything the browser may read MUST be
 * prefixed `NEXT_PUBLIC_` and declared in `clientEnv`.
 *
 * This is the ONLY module allowed to touch `process.env` — every other call
 * site imports from here (enforced by the ESLint guardrail pack).
 */

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /**
   * Upstream backend base URL used by the `/api/session` route handlers
   * (server-side only). Defaults to the public URL so a single-origin setup
   * needs one variable, not two.
   */
  BACKEND_API_URL: z.string().min(1).optional(),
  /** Name of the httpOnly cookie holding the refresh token. */
  SESSION_COOKIE_NAME: z.string().min(1).default("session"),
});

const clientSchema = z.object({
  /** Where the browser sends data API calls (the external backend). */
  NEXT_PUBLIC_API_URL: z.string().min(1).default("http://localhost:4000/api"),
  /** Display name, used in metadata and the app shell. */
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Codeable App"),
});

export const serverEnv = serverSchema.parse(process.env);

export const clientEnv = clientSchema.parse({
  // Listed explicitly, never spread: Next inlines `process.env.NEXT_PUBLIC_*`
  // at build time only where it sees the literal property access.
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});

/** Upstream backend URL for server-side calls (session route handlers). */
export const backendApiUrl =
  serverEnv.BACKEND_API_URL ?? clientEnv.NEXT_PUBLIC_API_URL;
