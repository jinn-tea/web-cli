import { describe, expect, it } from "vitest";
import { buildBrandRamp } from "./brand.js";
import {
  identifierFor,
  normalizeDashboardKeys,
  removeNamedImport,
  removeNamespace,
  removeNavItem,
  removeRegistryEntry,
  replaceBrandRamp,
  rewritePackageJson,
  rewriteRolesNamespace,
  seedLocaleCatalog,
} from "./transforms.js";

/**
 * These transforms edit files copied from the template. They MUST fail loudly
 * when their anchor is missing — a silent no-op would ship a project carrying
 * the template's own roles, brand and reference domain.
 */

const CATALOG = `/**
 * SOURCE CATALOG
 */
const en = {
  common: {
    actions: {
      save: "Save",
    },
  },

  roles: {
    admin: "Admin",
    member: "Member",
  },

  dashboard: {
    title: "Dashboard",
    welcome: "Welcome back, {name}",
    adminSubtitle: "Everything across the workspace.",
    memberSubtitle: "Your work at a glance.",
    empty: "Nothing here yet",
  },

  orders: {
    title: "Orders",
    columns: {
      reference: "Reference",
    },
  },
};

export default en;
`;

describe("rewriteRolesNamespace", () => {
  it("replaces the roles block with the project's roles", () => {
    const result = rewriteRolesNamespace(
      CATALOG,
      ["lager", "forwarder"],
      (role) => role.toUpperCase(),
    );
    expect(result).toContain('lager: "LAGER",');
    expect(result).toContain('forwarder: "FORWARDER",');
    expect(result).not.toContain('admin: "Admin"');
    // Neighbouring namespaces must survive intact.
    expect(result).toContain('save: "Save"');
    expect(result).toContain('title: "Dashboard"');
  });

  it("throws when the anchor is gone rather than silently doing nothing", () => {
    expect(() =>
      rewriteRolesNamespace("const en = {};", ["a"], (r) => r),
    ).toThrow(/roles/);
  });
});

describe("removeNamespace", () => {
  it("removes a nested block without disturbing its neighbours", () => {
    const result = removeNamespace(CATALOG, "orders");
    expect(result).not.toContain("Orders");
    expect(result).not.toContain("Reference");
    expect(result).toContain('title: "Dashboard"');
    // Balanced braces mean the file still parses.
    expect(result.split("{").length).toBe(result.split("}").length);
  });

  it("is a no-op for a namespace that isn't there", () => {
    expect(removeNamespace(CATALOG, "nope")).toBe(CATALOG);
  });
});

describe("normalizeDashboardKeys", () => {
  it("collapses per-role subtitles into one key", () => {
    const result = normalizeDashboardKeys(CATALOG);
    expect(result).toContain("subtitle:");
    expect(result).not.toContain("adminSubtitle");
    expect(result).not.toContain("memberSubtitle");
    expect(result).toContain('welcome: "Welcome back, {name}"');
  });
});

describe("replaceBrandRamp", () => {
  const css = `:root {
  --radius: 0.5rem;

  --brand-50: #eff6ff;
  --brand-100: #dbeafe;
  --brand-200: #bfdbfe;
  --brand-300: #93c5fd;
  --brand-400: #60a5fa;
  --brand-500: #3b82f6;
  --brand-600: #2563eb; /* PRIMARY */
  --brand-700: #1d4ed8;
  --brand-800: #1e40af;
  --brand-900: #1e3a8a;
  --brand-950: #172554;

  --canvas: #f8fafc;
}`;

  it("swaps every step and keeps the surrounding declarations", () => {
    const result = replaceBrandRamp(css, buildBrandRamp("#10b981"));
    expect(result).toContain("#10b981");
    expect(result).not.toContain("#2563eb");
    expect(result).toContain("--radius: 0.5rem;");
    expect(result).toContain("--canvas: #f8fafc;");
    expect(result.match(/--brand-\d+:/g)).toHaveLength(11);
  });

  it("throws when the ramp block is missing", () => {
    expect(() => replaceBrandRamp(":root {}", buildBrandRamp("#10b981"))).toThrow(
      /brand ramp/,
    );
  });
});

describe("registry edits", () => {
  it("removes a route entry", () => {
    const routes = `export const APP_ROUTES = {
  dashboard: "/dashboard",
  orders: "/orders",
  settings: "/settings",
} as const;`;
    const result = removeRegistryEntry(routes, "orders");
    expect(result).not.toContain("orders");
    expect(result).toContain("dashboard");
    expect(result).toContain("settings");
  });

  it("removes a nav item and its now-unused icon import", () => {
    const nav = `import {
  LayoutDashboard,
  Settings,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: APP_ROUTES.dashboard,
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
    roles: "all",
  },
  {
    href: APP_ROUTES.orders,
    labelKey: "orders.title",
    icon: ShoppingCart,
    roles: ["admin"],
  },
  {
    href: APP_ROUTES.settings,
    labelKey: "nav.settings",
    icon: Settings,
    roles: "all",
  },
];`;

    let result = removeNavItem(nav, "orders");
    result = removeNamedImport(result, "ShoppingCart");

    expect(result).not.toContain("orders.title");
    expect(result).not.toContain("ShoppingCart");
    expect(result).toContain("nav.dashboard");
    expect(result).toContain("nav.settings");
  });
});

describe("seedLocaleCatalog", () => {
  it("marks every string and declares satisfies Messages", () => {
    const result = seedLocaleCatalog(CATALOG, "de");
    expect(result).toContain('save: "TODO(de): Save"');
    expect(result).toContain("const de = {");
    expect(result).toContain("export default de satisfies Messages;");
    // Alias import — generated code obeys the same lint rules as hand-written.
    expect(result).toContain('from "@/i18n/types"');
    expect(result).not.toContain('from "../types"');
  });
});

describe("rewritePackageJson", () => {
  it("sets the name and keeps dependencies untouched", () => {
    const pkg = JSON.stringify(
      { name: "codeable-web-template", version: "9.9.9", dependencies: { next: "16" } },
      null,
      2,
    );
    const parsed = JSON.parse(
      rewritePackageJson(pkg, { name: "my-app", description: "Mine" }),
    ) as Record<string, unknown>;

    expect(parsed.name).toBe("my-app");
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.private).toBe(true);
    expect(parsed.dependencies).toEqual({ next: "16" });
  });
});

describe("identifierFor", () => {
  it("makes a locale code usable as a JS identifier", () => {
    expect(identifierFor("en")).toBe("en");
    expect(identifierFor("pt-BR")).toBe("ptBR");
  });
});
