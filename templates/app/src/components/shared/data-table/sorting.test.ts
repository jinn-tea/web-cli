import { describe, expect, it } from "vitest";
import { buildSort, parseSort, toggleSort } from "./sorting";

describe("parseSort", () => {
  it("reads an ascending field", () => {
    expect(parseSort("createdAt")).toEqual({
      field: "createdAt",
      direction: "asc",
    });
  });

  it("reads a descending field", () => {
    expect(parseSort("-createdAt")).toEqual({
      field: "createdAt",
      direction: "desc",
    });
  });

  it("treats an empty string as unsorted", () => {
    expect(parseSort("").field).toBeNull();
  });
});

describe("toggleSort", () => {
  it("cycles asc → desc → unsorted so the default order is reachable", () => {
    expect(toggleSort("", "total")).toBe("total");
    expect(toggleSort("total", "total")).toBe("-total");
    expect(toggleSort("-total", "total")).toBe("");
  });

  it("starts a different column ascending rather than inheriting direction", () => {
    expect(toggleSort("-total", "createdAt")).toBe("createdAt");
  });
});

describe("buildSort", () => {
  it("round-trips through parseSort", () => {
    const encoded = buildSort("customerName", "desc");
    expect(parseSort(encoded)).toEqual({
      field: "customerName",
      direction: "desc",
    });
  });
});
