/**
 * Package version, stamped at build time by tsup (`define.__CLI_VERSION__`).
 * The fallback keeps `tsx src/cli.ts` working during development.
 */
declare const __CLI_VERSION__: string | undefined;

export const version =
  typeof __CLI_VERSION__ === "string" ? __CLI_VERSION__ : "0.0.0-dev";
