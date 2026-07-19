#!/usr/bin/env node
/**
 * Prove `domain` → `remove-domain` is a true inverse.
 *
 * The generator edits six shared registries; if removal misses one, the project
 * accumulates dead routes, orphaned query keys and untranslatable label keys
 * over time. Hashing the whole source tree before and after is the only check
 * that catches ALL of them, including the ones nobody thought to assert.
 */
import { execa } from "execa";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repoRoot, "bin/codeable-web.js");

/** Hash every source file so any stray character shows up. */
async function hashTree(dir) {
  const entries = new Map();

  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (["node_modules", ".next", ".git", "test-results"].includes(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else entries.set(path.relative(dir, absolute), await fs.readFile(absolute, "utf8"));
    }
  }
  await walk(dir);

  const sorted = [...entries.entries()].sort(([a], [b]) => a.localeCompare(b));
  const hash = crypto.createHash("sha256");
  for (const [file, content] of sorted) hash.update(`${file}\0${content}\0`);
  return { digest: hash.digest("hex"), files: new Map(sorted) };
}

function diff(before, after) {
  const changed = [];
  for (const [file, content] of before.files) {
    if (!after.files.has(file)) changed.push(`missing after removal: ${file}`);
    else if (after.files.get(file) !== content) changed.push(`differs: ${file}`);
  }
  for (const file of after.files.keys()) {
    if (!before.files.has(file)) changed.push(`left behind: ${file}`);
  }
  return changed;
}

const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "codeable-roundtrip-"));
const projectDir = path.join(workDir, "rt");

try {
  await execa("node", [cli, "create", "rt", "--roles", "admin,staff", "--locales", "en,de",
    "--output", workDir, "--no-install", "--no-git"], { stdio: "ignore" });

  const before = await hashTree(projectDir);

  await execa("node", [cli, "domain", "vehicle-types", "--role", "admin"],
    { cwd: projectDir, stdio: "ignore" });

  const withDomain = await hashTree(projectDir);
  if (withDomain.digest === before.digest) {
    throw new Error("domain generation changed nothing — the test proves nothing");
  }

  // Idempotence: regenerating (with --force, since overwriting files needs
  // consent) must not double-wire anything.
  await execa("node", [cli, "domain", "vehicle-types", "--role", "admin", "--force"],
    { cwd: projectDir, stdio: "ignore" });
  const twice = await hashTree(projectDir);
  if (twice.digest !== withDomain.digest) {
    const changed = diff(withDomain, twice);
    throw new Error(`domain is not idempotent:\n  ${changed.join("\n  ")}`);
  }
  console.log("✓ domain is idempotent");

  await execa("node", [cli, "remove-domain", "vehicle-types", "--role", "admin", "--yes"],
    { cwd: projectDir, stdio: "ignore" });

  const after = await hashTree(projectDir);
  const changed = diff(before, after);

  if (changed.length > 0) {
    console.error(`✗ remove-domain is not an exact inverse:\n  ${changed.join("\n  ")}`);
    process.exit(1);
  }
  console.log("✓ remove-domain restores the tree byte for byte");
} finally {
  await fs.rm(workDir, { recursive: true, force: true });
}
