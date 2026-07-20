/**
 * Wire-level types for the backend envelope convention:
 *
 *   { statusCode, data: T | null, error: { timestamp, message } | null }
 *
 * Success is implied by `error === null` (there is no top-level `success`
 * flag). The backend client unwraps this and returns `data` directly, or throws
 * an `ApiError` — so app code NEVER touches the envelope.
 *
 * If your backend uses a different envelope, this file and `backend-client.ts`
 * are the only two places that need to change.
 */

import { z } from "zod";

export interface ApiErrorPayload {
  timestamp: string;
  message: string;
}

export interface ApiEnvelope<T> {
  statusCode: number;
  data: T | null;
  error: ApiErrorPayload | null;
}

/** Generic `{ message }` payload (logout, delete, …). */
export interface MessageResult {
  message: string;
}

/** Raw pagination block as the backend sends it (snake_case). */
export interface RawPagination {
  current_page: number;
  total_pages: number;
  total_items: number;
}

/** Normalized pagination for app/UI use (camelCase). */
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

/** A page of results, as repositories return them. */
export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

/**
 * Runtime shape of the pagination block.
 *
 * Every field is optional because `normalizePagination` already defaults a
 * missing one — the schema's job is to reject a field that is *present but the
 * wrong type* (`total_pages: "3"`), which is what silently produces NaN.
 */
export const rawPaginationSchema = z
  .object({
    current_page: z.number(),
    total_pages: z.number(),
    total_items: z.number(),
  })
  .partial();

/**
 * Build the response schema for a paginated list: `paginatedResponseSchema(orderListItemSchema)`.
 *
 * Pass the LIST-ROW schema, not the detail one. A table needs a handful of
 * columns; requiring every field a detail view shows is how a frontend model
 * ends up dictating that the backend enrich every list endpoint.
 */
export function paginatedResponseSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item).default([]),
    pagination: rawPaginationSchema.default({}),
  });
}

/**
 * snake_case → camelCase at the repository edge. Tolerates a partial or
 * malformed block rather than yielding NaN/undefined downstream.
 */
export function normalizePagination(raw: Partial<RawPagination>): Pagination {
  const currentPage = raw.current_page ?? 1;
  const totalPages = raw.total_pages ?? 1;
  return {
    currentPage,
    totalPages,
    totalItems: raw.total_items ?? 0,
    hasMore: currentPage < totalPages,
  };
}
