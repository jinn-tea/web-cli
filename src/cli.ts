import { Command } from "commander";
import pc from "picocolors";
import { registerCreate } from "./commands/create.js";
import { registerDoctor } from "./commands/doctor.js";
import { registerGuardrails } from "./commands/guardrails.js";
import { registerDomain } from "./commands/domain.js";
import { registerMisc } from "./commands/misc.js";
import { registerRole } from "./commands/role.js";
import { version } from "./version.js";

/**
 * Entry point.
 *
 * Commands stay thin — parse, prompt for anything missing, validate, then hand
 * off to a generator. All the logic lives in `generators/` and `engine/`, which
 * is what makes it unit-testable without spawning a CLI.
 */
const program = new Command("jinn-web")
  .description(
    "Scaffold and grow production-ready Next.js apps with the Codeable architecture.",
  )
  .version(version, "-v, --version")
  .showHelpAfterError();

registerCreate(program);
registerDomain(program);
registerRole(program);
registerMisc(program);
registerDoctor(program);
registerGuardrails(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${pc.red("✖")} ${message}\n`);
  process.exit(3);
});
