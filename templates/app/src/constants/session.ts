/**
 * Fallback name of the httpOnly session cookie.
 *
 * A constant rather than a literal in each reader, because there are two of
 * them: `config/env.ts` (as the schema default) and `proxy.ts`. The proxy
 * deliberately does NOT import `config/env` — it runs on every navigation and
 * prefetch, and parsing the whole server env there would turn one bad variable
 * into a 500 on every route instead of a startup error. Two literals is how a
 * cookie rename half-lands; this way there is one.
 */
export const DEFAULT_SESSION_COOKIE_NAME = "session";
