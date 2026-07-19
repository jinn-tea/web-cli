import * as p from "@clack/prompts";
import pc from "picocolors";
import type { ValidationResult } from "./naming.js";

/**
 * All user-facing CLI output goes through here.
 *
 * Two rules borrowed from the Flutter CLI's UX, which is the part of it users
 * actually praise:
 *  1. FLAG FIRST, PROMPT SECOND — a value supplied by flag is never asked
 *     about. That makes every command equally usable by a human, by CI, and by
 *     an agent.
 *  2. Every long step reports what it did and how long it took, so a slow
 *     scaffold never looks hung.
 */

export function intro(message: string): void {
  p.intro(pc.bgCyan(pc.black(` ${message} `)));
}

export function outro(message: string): void {
  p.outro(message);
}

export function note(message: string, title?: string): void {
  p.note(message, title);
}

export function warn(message: string): void {
  p.log.warn(pc.yellow(message));
}

export function info(message: string): void {
  p.log.info(message);
}

export function success(message: string): void {
  p.log.success(pc.green(message));
}

export function error(message: string): void {
  p.log.error(pc.red(message));
}

/** Abort cleanly on Ctrl-C rather than throwing a stack trace at the user. */
function ensureNotCancelled<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Cancelled.");
    process.exit(1);
  }
  return value as T;
}

/**
 * True when nobody can answer a prompt — CI, a pipe, or an agent.
 *
 * Prompting there doesn't fail, it HANGS, which is the worst outcome: the job
 * sits until it times out with no useful output. Every ask falls back to its
 * default instead, and errors only when there isn't one.
 */
export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY) && !process.env.CI;
}

export async function askText(
  flagValue: string | undefined,
  options: {
    message: string;
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string) => ValidationResult;
  },
): Promise<string> {
  if (flagValue !== undefined) {
    const result = options.validate?.(flagValue);
    if (result && !result.ok) {
      error(result.message ?? "Invalid value.");
      process.exit(1);
    }
    return flagValue;
  }

  if (!isInteractive()) {
    if (options.defaultValue === undefined) {
      fail(
        `Missing a required value and there's no terminal to ask on: ${options.message}\n` +
          `Pass it as a flag when running non-interactively.`,
      );
    }
    info(`${options.message} ${pc.dim(`→ ${options.defaultValue} (default)`)}`);
    return options.defaultValue;
  }

  const answer = await p.text({
    message: options.message,
    placeholder: options.placeholder ?? options.defaultValue,
    defaultValue: options.defaultValue,
    validate: (value) => {
      const candidate = value || options.defaultValue || "";
      const result = options.validate?.(candidate);
      return result && !result.ok ? result.message : undefined;
    },
  });

  return ensureNotCancelled(answer) || (options.defaultValue ?? "");
}

export async function askConfirm(
  message: string,
  initialValue = false,
): Promise<boolean> {
  // Non-interactive: take the safe default rather than hanging. Callers pass
  // `false` for anything destructive, so silence never means "go ahead".
  if (!isInteractive()) {
    info(`${message} ${pc.dim(`→ ${initialValue ? "yes" : "no"} (default)`)}`);
    return initialValue;
  }
  return ensureNotCancelled(await p.confirm({ message, initialValue }));
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export async function askSelect<T extends string>(
  message: string,
  options: SelectOption<T>[],
): Promise<T> {
  // clack's `Option<Value>` is a conditional type; TypeScript can't resolve it
  // against an unresolved generic, so it rejects a structurally-identical
  // array. The shape is correct — assert past the conditional.
  const answer = await p.select({
    message,
    options: options as unknown as Parameters<typeof p.select<T>>[0]["options"],
  });
  return ensureNotCancelled(answer);
}

/** Run a step with a spinner, reporting elapsed time like the Flutter CLI. */
export async function step<T>(
  label: string,
  run: () => Promise<T>,
): Promise<T> {
  const spinner = p.spinner();
  spinner.start(label);
  const started = Date.now();
  try {
    const result = await run();
    spinner.stop(`${label} ${pc.dim(`(${Date.now() - started}ms)`)}`);
    return result;
  } catch (err) {
    spinner.stop(pc.red(`${label} — failed`));
    throw err;
  }
}

/** Exit with a clean, readable message instead of a stack trace. */
export function fail(message: string, exitCode = 1): never {
  error(message);
  process.exit(exitCode);
}
