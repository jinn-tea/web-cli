#!/usr/bin/env node
/**
 * Prove the roleless → role-first migration works, and that it's atomic.
 *
 * This is the most intricate path in the CLI — fourteen file restorations,
 * folder moves, an import rewrite across the tree, and two targeted edits to
 * files the user owns. Three bugs surfaced in it within minutes of manual
 * testing, which is exactly why it needs to be exercised on every push.
 */
import { execa } from "execa";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repoRoot, "bin/jinn-web.js");

async function hashTree(dir) {
  const entries = [];
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else entries.push([path.relative(dir, absolute), await fs.readFile(absolute, "utf8")]);
    }
  }
  await walk(dir);
  entries.sort(([a], [b]) => a.localeCompare(b));
  const hash = crypto.createHash("sha256");
  for (const [file, content] of entries) hash.update(`${file}\0${content}\0`);
  return hash.digest("hex");
}

const exists = (p) => fs.access(p).then(() => true).catch(() => false);

async function typecheck(dir) {
  const result = await execa("npx", ["tsc", "--noEmit", "--pretty", "false"], {
    cwd: dir,
    reject: false,
  });
  return `${result.stdout}\n${result.stderr}`
    .split("\n")
    .filter((line) => /error TS/.test(line));
}

const work = await fs.mkdtemp(path.join(os.tmpdir(), "jinn-web-migration-"));
let failed = false;

try {
  // ── A roleless project with a domain, installed so tsc can run.
  const dir = path.join(work, "shop");
  await execa("node", [cli, "create", "shop", "--no-roles", "--output", work,
    "--no-install", "--no-git"], { stdio: "ignore" });
  await execa("node", [cli, "domain", "posts"], { cwd: dir, stdio: "ignore" });
  await execa("npm", ["install", "--no-audit", "--no-fund"], { cwd: dir, stdio: "ignore" });

  if ((await typecheck(dir)).length > 0) {
    console.error("✗ the roleless baseline doesn't compile");
    process.exit(1);
  }
  console.log("✓ roleless project with a domain compiles");

  // ── Rollback: a migration that fails must leave the tree untouched.
  //    Removing the template's marker file makes the restore step throw.
  const rollbackDir = path.join(work, "rollback");
  await fs.cp(dir, rollbackDir, { recursive: true });
  const before = await hashTree(path.join(rollbackDir, "src"));

  // A read-only src/constants forces a write failure part-way through.
  const guard = path.join(rollbackDir, "src", "constants");
  await fs.chmod(guard, 0o500);
  await execa("node", [cli, "role", "admin"], { cwd: rollbackDir, reject: false, stdio: "ignore" });
  await fs.chmod(guard, 0o755);

  const after = await hashTree(path.join(rollbackDir, "src"));
  if (after !== before) {
    console.error("✗ a failed migration left the tree modified — it isn't atomic");
    failed = true;
  } else {
    console.log("✓ a failed migration rolls the tree back");
  }

  // ── The real thing.
  await execa("node", [cli, "role", "admin"], { cwd: dir, stdio: "ignore" });

  const checks = [
    ["features moved under common/", path.join(dir, "src/features/common/posts")],
    ["the new role's folder exists", path.join(dir, "src/features/admin/dashboard")],
    ["roles.ts created", path.join(dir, "src/constants/roles.ts")],
    ["RoleScreens restored", path.join(dir, "src/components/shared/role-screens.tsx")],
  ];
  for (const [label, target] of checks) {
    if (await exists(target)) console.log(`✓ ${label}`);
    else {
      console.error(`✗ ${label} — missing ${target}`);
      failed = true;
    }
  }

  // The user's generated nav item and query key must survive the migration.
  const nav = await fs.readFile(path.join(dir, "src/components/layout/nav-config.ts"), "utf8");
  const keys = await fs.readFile(path.join(dir, "src/constants/query-keys.ts"), "utf8");
  if (!nav.includes("posts.title")) {
    console.error("✗ the generated nav item was lost");
    failed = true;
  } else if (!keys.includes("posts:")) {
    console.error("✗ the generated query key factory was lost");
    failed = true;
  } else {
    console.log("✓ generated nav item and query key survived");
  }

  // What remains must be ONLY the query-key scoping the checklist reports.
  const remaining = await typecheck(dir);
  const offTopic = remaining.filter((line) => !line.includes("use-posts.ts"));
  if (offTopic.length > 0) {
    console.error(`✗ migration left unrelated errors:\n  ${offTopic.slice(0, 4).join("\n  ")}`);
    failed = true;
  } else {
    console.log(`✓ only the expected query-key decisions remain (${remaining.length})`);
  }

  process.exit(failed ? 1 : 0);
} finally {
  await fs.rm(work, { recursive: true, force: true });
}
