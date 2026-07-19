import { defineConfig } from "tsup";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as {
  version: string;
};

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  sourcemap: true,
  // Stamp the version at build time — the CLI reports it and uses it to detect
  // template drift in projects it generated.
  define: { __CLI_VERSION__: JSON.stringify(pkg.version) },
});
