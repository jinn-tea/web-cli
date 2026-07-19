import { describe, expect, it } from "vitest";
import {
  ROLES,
  ROLE_LABEL_KEYS,
  ROLE_TO_GROUP,
  canInvite,
  isRole,
  roleGroupFor,
} from "./roles";

describe("roles", () => {
  it("maps every role to a group and a label key", () => {
    // The real guarantee is at compile time (Record<Role, …> can't be partial),
    // but this catches a map that was widened to a plain object in a refactor.
    for (const role of ROLES) {
      expect(ROLE_TO_GROUP[role]).toBeDefined();
      expect(ROLE_LABEL_KEYS[role]).toBeDefined();
    }
  });

  it("narrows unknown strings", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("superuser")).toBe(false);
  });

  it("resolves the backend group for a role", () => {
    expect(roleGroupFor("admin")).toBe("admin");
  });

  it("grants invite capability only to admins", () => {
    expect(canInvite("admin")).toBe(true);
    expect(canInvite("member")).toBe(false);
  });
});
