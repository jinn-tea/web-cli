import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tanstackQuery from "@tanstack/eslint-plugin-query";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * CODEABLE WEB GUARDRAILS
 *
 * These rules encode the architecture so it can't quietly erode. A convention
 * the linter enforces survives; one that lives only in a doc lasts until the
 * first deadline.
 *
 * Each block below maps to a rule in the `jinn-web-quality` skill. The
 * judgment-based rules it can't express (is this domain in the right role
 * folder? is this component doing business logic?) are what `/web-audit` and
 * `jinn-web doctor` are for.
 * ─────────────────────────────────────────────────────────────────────────
 */
const eslintConfig = defineConfig([
  // `eslint-config-next/core-web-vitals` already bundles jsx-a11y — adding the
  // plugin again is a "cannot redefine plugin" error, so specific a11y rules
  // are raised in the codeable block below instead.
  ...nextVitals,
  ...nextTs,
  ...tanstackQuery.configs["flat/recommended"],

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),

  {
    name: "jinn-web/architecture",
    rules: {
      // ── AR-002/003 · Layering ──────────────────────────────────────────
      // Dependencies point inward. Shared layers never import features, and
      // features never reach sideways into a sibling — a symbol two of them
      // need moves UP instead.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],
              message:
                "Use the '@/*' alias instead of relative parent imports (CQ-002).",
            },
          ],
        },
      ],

      // ── CC-006 · Logging ───────────────────────────────────────────────
      // All logging goes through lib/reporting so production has one seam.
      "no-console": "error",

      // ── CC-002 · Native dialogs ────────────────────────────────────────
      "no-alert": "error",

      // ── TV-003 · Type safety ───────────────────────────────────────────
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",

      // ── §16 · Accessibility (raised above next's defaults) ─────────────
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/no-autofocus": "off", // autofocusing a form's first field is intentional here
      "jsx-a11y/role-has-required-aria-props": "error",

      // ── DS-002 / §15 · Transport & env discipline ──────────────────────
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env']",
          message:
            "Read environment variables from '@/config/env' — only config/env.ts may touch process.env (§15).",
        },
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            "Call the backend through 'backendClient' (@/lib/http) — a raw fetch skips auth, envelope unwrapping, refresh-on-401 and abort handling (DS-002).",
        },
      ],
    },
  },

  {
    // Infrastructure defines the primitives the rules above point at, so it is
    // exempt from them — narrowly, by path.
    name: "jinn-web/infrastructure-exemptions",
    files: [
      "src/lib/http/**",
      "src/lib/auth/session.ts",
      "src/lib/reporting.ts",
      "src/config/env.ts",
      "src/proxy.ts",
      "src/app/api/**",
    ],
    rules: {
      "no-restricted-syntax": "off",
      "no-console": "off",
    },
  },

  {
    // Tooling configs and the e2e sweep run in Node, outside the app's runtime,
    // and legitimately read raw env (CI flags, base URLs). They are not part of
    // the shipped bundle, so `config/env.ts` doesn't apply to them.
    name: "jinn-web/tooling",
    files: [
      "*.config.{ts,mjs,js}",
      "e2e/**",
      "src/**/*.test.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": "off",
      "no-console": "off",
    },
  },

  {
    // shadcn primitives are generated — recolor via tokens in globals.css,
    // don't fight their conventions here.
    name: "jinn-web/generated-ui",
    files: ["src/components/ui/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "jsx-a11y/heading-has-content": "off",
      // shadcn's pagination renders link shells that receive content from the
      // call site; the rule can't see that across the boundary.
      "jsx-a11y/anchor-has-content": "off",
    },
  },
]);

export default eslintConfig;
