import { describe, expect, it } from "vitest";
import { formatSource } from "./format.js";
import {
  addArrayElement,
  addCatalogNamespace,
  addExportStar,
  addNamedImport,
  addObjectProperty,
  removeArrayElement,
  removeCatalogNamespace,
  removeExportStar,
  removeNamedImport,
  removeObjectProperty,
  withVirtualFile,
} from "./codemods.js";

/**
 * The contract every codemod must honour, because `remove-domain` depends on it:
 * applying twice equals applying once, and apply→remove returns the ORIGINAL
 * text byte for byte.
 */

const ROUTES = `export const APP_ROUTES = {
  dashboard: "/dashboard",
  settings: "/settings",
} as const;
`;

const NAV = `import { LayoutDashboard, Settings, type LucideIcon } from "lucide-react";

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: APP_ROUTES.dashboard,
    labelKey: "nav.dashboard",
    icon: LayoutDashboard,
    roles: "all",
  },
];
`;

const CATALOG = `const en = {
  common: {
    save: "Save",
  },
  nav: {
    dashboard: "Dashboard",
  },
};

export default en;
`;

const API_INDEX = `export * from "@/features/common/auth/constants";
`;

describe("addObjectProperty", () => {
  it("inserts a property alphabetically", () => {
    const result = withVirtualFile("routes.ts", ROUTES, (file) => {
      addObjectProperty(file, "APP_ROUTES", "orders", '"/orders"');
    });
    expect(result).toContain('orders: "/orders"');
    // Between dashboard and settings, so repeated runs diff cleanly.
    expect(result.indexOf("dashboard")).toBeLessThan(result.indexOf("orders"));
    expect(result.indexOf("orders")).toBeLessThan(result.indexOf("settings"));
  });

  it("is idempotent", () => {
    const once = withVirtualFile("routes.ts", ROUTES, (file) => {
      addObjectProperty(file, "APP_ROUTES", "orders", '"/orders"');
    });
    const twice = withVirtualFile("routes.ts", once, (file) => {
      const changed = addObjectProperty(file, "APP_ROUTES", "orders", '"/orders"');
      expect(changed).toBe(false);
    });
    expect(twice).toBe(once);
  });

  it("round-trips back to the original text", async () => {
    const added = withVirtualFile("routes.ts", ROUTES, (file) => {
      addObjectProperty(file, "APP_ROUTES", "orders", '"/orders"');
    });
    const removed = withVirtualFile("routes.ts", added, (file) => {
      removeObjectProperty(file, "APP_ROUTES", "orders");
    });
    // Through Prettier: ts-morph normalizes indentation but not trailing
    // commas, so canonical formatting is what makes the inverse exact.
    expect(await formatSource(removed, "routes.ts")).toBe(
      await formatSource(ROUTES, "routes.ts"),
    );
  });

  it("throws with a useful message when the target is gone", () => {
    expect(() =>
      withVirtualFile("routes.ts", "export const OTHER = {};", (file) => {
        addObjectProperty(file, "APP_ROUTES", "orders", '"/orders"');
      }),
    ).toThrow(/APP_ROUTES/);
  });
});

describe("array elements", () => {
  const navItem = `{
    href: APP_ROUTES.orders,
    labelKey: "orders.title",
    icon: ShoppingCart,
    roles: ["admin"],
  }`;
  const matchesOrders = (text: string) => text.includes("APP_ROUTES.orders");

  it("appends and is idempotent", () => {
    const once = withVirtualFile("nav.ts", NAV, (file) => {
      addArrayElement(file, "NAV_ITEMS", navItem, matchesOrders);
    });
    expect(once).toContain("orders.title");

    const twice = withVirtualFile("nav.ts", once, (file) => {
      expect(addArrayElement(file, "NAV_ITEMS", navItem, matchesOrders)).toBe(false);
    });
    expect(twice).toBe(once);
  });

  it("round-trips", async () => {
    const added = withVirtualFile("nav.ts", NAV, (file) => {
      addArrayElement(file, "NAV_ITEMS", navItem, matchesOrders);
    });
    const removed = withVirtualFile("nav.ts", added, (file) => {
      removeArrayElement(file, "NAV_ITEMS", matchesOrders);
    });
    expect(await formatSource(removed, "nav.ts")).toBe(
      await formatSource(NAV, "nav.ts"),
    );
  });
});

describe("named imports", () => {
  it("merges into the existing declaration, sorted", () => {
    const result = withVirtualFile("nav.ts", NAV, (file) => {
      addNamedImport(file, "lucide-react", "ShoppingCart");
    });
    expect(result).toContain("ShoppingCart");
    expect(result.match(/from "lucide-react"/g)).toHaveLength(1);
  });

  it("is idempotent and reversible", () => {
    const added = withVirtualFile("nav.ts", NAV, (file) => {
      addNamedImport(file, "lucide-react", "ShoppingCart");
    });
    withVirtualFile("nav.ts", added, (file) => {
      expect(addNamedImport(file, "lucide-react", "ShoppingCart")).toBe(false);
    });

    const removed = withVirtualFile("nav.ts", added, (file) => {
      removeNamedImport(file, "lucide-react", "ShoppingCart");
    });
    expect(removed).toContain("LayoutDashboard");
    expect(removed).not.toContain("ShoppingCart");
  });

  it("drops the declaration when the last import goes", () => {
    const source = `import { Only } from "somewhere";\nconst x = 1;\n`;
    const result = withVirtualFile("x.ts", source, (file) => {
      removeNamedImport(file, "somewhere", "Only");
    });
    // An empty `import {} from "…"` would be a lint error.
    expect(result).not.toContain("somewhere");
  });
});

describe("export star", () => {
  it("adds, dedupes and removes", async () => {
    const spec = "@/features/admin/orders/constants";
    const added = withVirtualFile("api.ts", API_INDEX, (file) => {
      addExportStar(file, spec);
    });
    expect(added).toContain(spec);

    withVirtualFile("api.ts", added, (file) => {
      expect(addExportStar(file, spec)).toBe(false);
    });

    const removed = withVirtualFile("api.ts", added, (file) => {
      removeExportStar(file, spec);
    });
    expect(await formatSource(removed, "api.ts")).toBe(
      await formatSource(API_INDEX, "api.ts"),
    );
  });
});

describe("catalog namespaces", () => {
  const namespace = `{
    title: "Orders",
    empty: "No orders yet",
  }`;

  it("adds a namespace and round-trips", async () => {
    const added = withVirtualFile("en.ts", CATALOG, (file) => {
      addCatalogNamespace(file, "orders", namespace);
    });
    expect(added).toContain('title: "Orders"');

    const removed = withVirtualFile("en.ts", added, (file) => {
      removeCatalogNamespace(file, "orders");
    });
    expect(await formatSource(removed, "en.ts")).toBe(
      await formatSource(CATALOG, "en.ts"),
    );
  });

  it("is idempotent", () => {
    const once = withVirtualFile("en.ts", CATALOG, (file) => {
      addCatalogNamespace(file, "orders", namespace);
    });
    const twice = withVirtualFile("en.ts", once, (file) => {
      expect(addCatalogNamespace(file, "orders", namespace)).toBe(false);
    });
    expect(twice).toBe(once);
  });
});
