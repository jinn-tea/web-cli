import { expect, test } from "@playwright/test";
import {
  PATHOLOGICAL_TEXT,
  PATHOLOGICAL_TOKEN,
  expectNoHorizontalOverflow,
  findUnnamedControls,
  findUnreachableClipping,
} from "./helpers";

/**
 * The systematic sweep. Grow the route list as the app grows — this file is the
 * cheapest place to catch a whole class of regression.
 *
 * Routes that don't need a session. Authed routes are swept in a separate file
 * once test credentials exist (see `README`).
 */
const PUBLIC_ROUTES = ["/login", "/design-system"] as const;

test.describe("layout resilience", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} never scrolls horizontally`, async ({ page }) => {
      await page.goto(route);
      await expectNoHorizontalOverflow(page);
    });

    test(`${route} has no unreachable truncated content`, async ({ page }) => {
      await page.goto(route);
      const offenders = await findUnreachableClipping(page);
      expect(
        offenders,
        `content is clipped with no way to reveal it: ${offenders.join(", ")}`,
      ).toEqual([]);
    });

    test(`${route} names every control`, async ({ page }) => {
      await page.goto(route);
      const offenders = await findUnnamedControls(page);
      expect(
        offenders,
        `interactive controls with no accessible name: ${offenders.join(", ")}`,
      ).toEqual([]);
    });
  }
});

test.describe("auth gating", () => {
  test("an authed route redirects to login and remembers the destination", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("the root redirects to login without a session", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("login form", () => {
  test("shows an inline error per field on empty submit", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Specific, field-level messages — not one generic banner.
    const invalid = page.locator("[aria-invalid='true']");
    await expect(invalid).toHaveCount(2);
  });

  test("clears the error once the field becomes valid", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator("#email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await page.locator("#email").fill("ada@example.com");
    await page.locator("#email").blur();
    await expect(page.locator("#email")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("survives pathological input without breaking the layout", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator("#email").fill(`${PATHOLOGICAL_TOKEN}@example.com`);
    await page.locator("#password").fill(PATHOLOGICAL_TEXT);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("design system", () => {
  test("renders every section without overflow at any width", async ({
    page,
  }) => {
    await page.goto("/design-system");
    await expect(
      page.getByRole("heading", { name: "Design system" }),
    ).toBeVisible();
    // The long-text card is the deliberate stress case on this page.
    await expectNoHorizontalOverflow(page);
  });

  /**
   * Regression guard. TruncatedText once measured itself correctly, set
   * `clipped`, and then re-parented the span into the tooltip trigger — which
   * detached the node its ResizeObserver was watching, fired at 0×0, and reset
   * the flag. The tooltip silently never appeared. Assert both halves: the long
   * value IS marked clipped, and a short one is NOT.
   */
  test("marks overflowing text as clipped and leaves short text alone", async ({
    page,
  }) => {
    await page.goto("/design-system");

    const longValue = page.locator("[data-clipped]", {
      hasText: "Internationale Handelsgesellschaft",
    });
    await expect(longValue).toHaveAttribute("data-clipped", "true");

    const shortValue = page.locator("[data-clipped]", {
      hasText: "ORD-2026-000481",
    });
    await expect(shortValue).toHaveAttribute("data-clipped", "false");
  });

  test("reveals the full value on hover when clipped", async ({ page }) => {
    await page.goto("/design-system");
    await page
      .locator("[data-clipped='true']")
      .filter({ hasText: "Internationale" })
      .hover();

    await expect(
      page
        .getByRole("tooltip")
        .filter({ hasText: "Kommanditgesellschaft" })
        .or(page.getByRole("tooltip").filter({ hasText: "Internationale" })),
    ).toBeVisible();
  });
});
