import { describe, expect, it } from "vitest";
import {
  parseList,
  toCamel,
  toConstant,
  toKebab,
  toPascal,
  toTitle,
  validateHex,
  validateLocale,
  validateName,
  validateRole,
} from "./naming.js";

describe("case helpers", () => {
  const cases = [
    { input: "vehicle-types", kebab: "vehicle-types", pascal: "VehicleTypes", camel: "vehicleTypes" },
    { input: "vehicleTypes", kebab: "vehicle-types", pascal: "VehicleTypes", camel: "vehicleTypes" },
    { input: "Vehicle Types", kebab: "vehicle-types", pascal: "VehicleTypes", camel: "vehicleTypes" },
    { input: "vehicle_types", kebab: "vehicle-types", pascal: "VehicleTypes", camel: "vehicleTypes" },
    { input: "orders", kebab: "orders", pascal: "Orders", camel: "orders" },
  ];

  // Every generator derives its identifiers from one input, so these must agree
  // no matter which casing the user typed.
  for (const { input, kebab, pascal, camel } of cases) {
    it(`normalizes "${input}"`, () => {
      expect(toKebab(input)).toBe(kebab);
      expect(toPascal(input)).toBe(pascal);
      expect(toCamel(input)).toBe(camel);
    });
  }

  it("builds titles and constants", () => {
    expect(toTitle("vehicle-types")).toBe("Vehicle Types");
    expect(toConstant("vehicle-types")).toBe("VEHICLE_TYPES");
  });
});

describe("validateName", () => {
  it("accepts kebab-case", () => {
    expect(validateName("vehicle-types").ok).toBe(true);
  });

  it("rejects casing and characters that would break file paths", () => {
    expect(validateName("VehicleTypes").ok).toBe(false);
    expect(validateName("vehicle types").ok).toBe(false);
    expect(validateName("2fast").ok).toBe(false);
    expect(validateName("trailing-").ok).toBe(false);
    expect(validateName("").ok).toBe(false);
  });
});

describe("validateRole", () => {
  it("rejects names that collide with the project structure", () => {
    // "common" always exists implicitly; the rest would collide with real dirs.
    expect(validateRole("common").ok).toBe(false);
    expect(validateRole("common").message).toMatch(/implicit/);
    expect(validateRole("lib").ok).toBe(false);
    expect(validateRole("lager").ok).toBe(true);
  });
});

describe("validateHex", () => {
  it("accepts six-digit hex with or without a hash", () => {
    expect(validateHex("#2563eb").ok).toBe(true);
    expect(validateHex("2563EB").ok).toBe(true);
  });

  it("rejects shorthand and nonsense", () => {
    expect(validateHex("#abc").ok).toBe(false);
    expect(validateHex("blue").ok).toBe(false);
  });
});

describe("validateLocale", () => {
  it("accepts language and language-REGION", () => {
    expect(validateLocale("en").ok).toBe(true);
    expect(validateLocale("pt-BR").ok).toBe(true);
  });

  it("rejects malformed codes", () => {
    expect(validateLocale("english").ok).toBe(false);
    expect(validateLocale("pt_br").ok).toBe(false);
  });
});

describe("parseList", () => {
  it("trims, drops blanks and de-duplicates", () => {
    expect(parseList(" admin , member ,, admin ")).toEqual(["admin", "member"]);
  });

  it("returns an empty list for undefined", () => {
    expect(parseList(undefined)).toEqual([]);
  });
});
