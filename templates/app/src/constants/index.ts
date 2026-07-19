export * from "./roles";
export * from "./routes";
export * from "./query-keys";

/** Debounce for search inputs, in ms. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Default page size for paginated lists. */
export const DEFAULT_PAGE_SIZE = 20;

/** Shared field length limits — mirrored by the Zod field primitives. */
export const FIELD_LIMITS = {
  name: 100,
  email: 254,
  passwordMin: 8,
  passwordMax: 72,
  description: 1000,
  phone: 20,
} as const;
