/**
 * Sort encoding for URL state: `"createdAt"` = ascending, `"-createdAt"` =
 * descending, `""` = unsorted.
 *
 * A single string (rather than two params) keeps URLs short, round-trips
 * cleanly through `nuqs`, and is what most REST backends already accept.
 */

export type SortDirection = "asc" | "desc";

export interface ParsedSort {
  field: string | null;
  direction: SortDirection;
}

export function parseSort(sort: string): ParsedSort {
  if (!sort) return { field: null, direction: "asc" };
  return sort.startsWith("-")
    ? { field: sort.slice(1), direction: "desc" }
    : { field: sort, direction: "asc" };
}

export function buildSort(field: string, direction: SortDirection): string {
  return direction === "desc" ? `-${field}` : field;
}

/** asc → desc → unsorted, so a user can always get back to the default order. */
export function toggleSort(current: string, field: string): string {
  const parsed = parseSort(current);
  if (parsed.field !== field) return buildSort(field, "asc");
  if (parsed.direction === "asc") return buildSort(field, "desc");
  return "";
}
