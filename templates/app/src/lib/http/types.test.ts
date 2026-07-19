import { describe, expect, it } from "vitest";
import { normalizePagination } from "./types";

describe("normalizePagination", () => {
  it("converts snake_case to camelCase", () => {
    expect(
      normalizePagination({ current_page: 2, total_pages: 5, total_items: 97 }),
    ).toEqual({
      currentPage: 2,
      totalPages: 5,
      totalItems: 97,
      hasMore: true,
    });
  });

  it("reports hasMore=false on the last page", () => {
    const result = normalizePagination({
      current_page: 5,
      total_pages: 5,
      total_items: 97,
    });
    expect(result.hasMore).toBe(false);
  });

  it("survives a missing or partial pagination block", () => {
    // A backend that omits pagination on an empty result must not produce NaN
    // and blank out the UI.
    expect(normalizePagination({})).toEqual({
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      hasMore: false,
    });
  });
});
