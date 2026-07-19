#!/usr/bin/env node
/**
 * Prove `doctor` catches what it claims to.
 *
 * A health check that never fails is indistinguishable from one that doesn't
 * work. So: scaffold a project, confirm it's clean, then break each invariant
 * in turn and assert that the RIGHT check fires — and only that one.
 */
import { execa } from "execa";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repoRoot, "bin/jinn-web.js");

/** Run doctor and return its parsed report (exit 2 = issues found). */
async function doctor(cwd) {
  const result = await execa("node", [cli, "doctor", "--json"], {
    cwd,
    reject: false,
  });
  return JSON.parse(result.stdout);
}

function failingChecks(report) {
  return report.checks
    .filter((check) => check.issues.some((issue) => !issue.warning))
    .map((check) => check.id);
}

const SCENARIOS = [
  {
    name: "a route constant is deleted",
    expect: "routes",
    // Legitimate cascade: the nav item still points at APP_ROUTES.orders, which
    // no longer exists. Both reports are true and both are useful.
    cascades: ["nav"],
    async break_(dir) {
      const file = path.join(dir, "src/constants/routes.ts");
      const source = await fs.readFile(file, "utf8");
      await fs.writeFile(file, source.replace(/^\s*orders: "\/orders",\n/m, ""));
    },
  },
  {
    name: "a query key is inlined",
    expect: "query-keys",
    async break_(dir) {
      const file = path.join(dir, "src/features/admin/orders/services/use-orders.ts");
      const source = await fs.readFile(file, "utf8");
      await fs.writeFile(
        file,
        source.replace(/queryKey: QUERY_KEYS\.orders\.list\([^)]*\),/, 'queryKey: ["orders"],'),
      );
    },
  },
  {
    name: "a nav label has no translation",
    expect: "nav",
    async break_(dir) {
      const file = path.join(dir, "src/components/layout/nav-config.ts");
      const source = await fs.readFile(file, "utf8");
      await fs.writeFile(file, source.replace('"orders.title"', '"orders.nonexistent"'));
    },
  },
  {
    name: "a domain is missing from the endpoint index",
    expect: "api-index",
    async break_(dir) {
      const file = path.join(dir, "src/api.ts");
      const source = await fs.readFile(file, "utf8");
      await fs.writeFile(
        file,
        source.replace(/^export \* from "@\/features\/admin\/orders\/constants";\n/m, ""),
      );
    },
  },
  {
    name: "a translation key is missing",
    expect: "i18n",
    async break_(dir) {
      const file = path.join(dir, "src/i18n/messages/de.ts");
      const source = await fs.readFile(file, "utf8");
      await fs.writeFile(file, source.replace(/^\s*deleteTitle:[\s\S]*?,\n/m, ""));
    },
  },
];

const work = await fs.mkdtemp(path.join(os.tmpdir(), "codeable-doctor-"));
const pristine = path.join(work, "pristine");

try {
  await execa("node", [cli, "create", "pristine", "--roles", "admin,staff",
    "--locales", "en,de", "--output", work, "--no-install", "--no-git"], { stdio: "ignore" });
  await execa("node", [cli, "domain", "orders", "--role", "admin"],
    { cwd: pristine, stdio: "ignore" });

  const baseline = await doctor(pristine);
  const baselineFailures = failingChecks(baseline);
  if (baselineFailures.length > 0) {
    console.error(`✗ a freshly generated project is not clean: ${baselineFailures.join(", ")}`);
    process.exit(1);
  }
  console.log("✓ a freshly generated project passes every check");

  let failed = false;
  for (const scenario of SCENARIOS) {
    const dir = path.join(work, scenario.expect);
    await fs.cp(pristine, dir, { recursive: true });
    await scenario.break_(dir);

    const failures = failingChecks(await doctor(dir));

    if (!failures.includes(scenario.expect)) {
      console.error(`✗ ${scenario.name}: expected "${scenario.expect}" to fail, got [${failures.join(", ")}]`);
      failed = true;
      continue;
    }
    // Extra failures usually mean a check is over-reaching into another's
    // territory, which makes reports noisy and untrustworthy — unless the
    // breakage genuinely invalidates more than one invariant, which the
    // scenario declares.
    const allowed = new Set([scenario.expect, ...(scenario.cascades ?? [])]);
    const extra = failures.filter((id) => !allowed.has(id));
    if (extra.length > 0) {
      console.error(`✗ ${scenario.name}: also failed unrelated checks [${extra.join(", ")}]`);
      failed = true;
      continue;
    }
    const also = scenario.cascades?.length
      ? ` (+ ${scenario.cascades.join(", ")})`
      : "";
    console.log(`✓ ${scenario.name} → ${scenario.expect}${also}`);
  }

  // --fix must actually repair, not just claim to.
  const fixDir = path.join(work, "fixable");
  await fs.cp(pristine, fixDir, { recursive: true });
  await SCENARIOS[0].break_(fixDir);
  await SCENARIOS[3].break_(fixDir);

  await execa("node", [cli, "doctor", "--fix"], { cwd: fixDir, reject: false, stdio: "ignore" });
  const afterFix = failingChecks(await doctor(fixDir));
  if (afterFix.length > 0) {
    console.error(`✗ --fix left issues behind: ${afterFix.join(", ")}`);
    failed = true;
  } else {
    console.log("✓ --fix repairs the mechanically-fixable breakages");
  }

  process.exit(failed ? 1 : 0);
} finally {
  await fs.rm(work, { recursive: true, force: true });
}
