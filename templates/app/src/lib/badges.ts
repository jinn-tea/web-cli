/**
 * Tone maps for status-like unions.
 *
 * A `Record<Union, Tone>` is exhaustive BY CONSTRUCTION: add a variant to the
 * union and TypeScript demands its tone here. That's the whole reason tone
 * lives in a map instead of a `switch` with a `default:` that silently swallows
 * new cases.
 *
 * Domains define their own maps beside their types; only unions shared by two
 * or more domains belong in this file.
 */
import type { StatusTone } from "@/components/shared/status-badge";

/** A generic lifecycle most resources end up needing. */
export const GENERIC_STATUSES = [
  "draft",
  "pending",
  "active",
  "completed",
  "cancelled",
] as const;

export type GenericStatus = (typeof GENERIC_STATUSES)[number];

export const GENERIC_STATUS_TONE: Record<GenericStatus, StatusTone> = {
  draft: "neutral",
  pending: "warning",
  active: "info",
  completed: "success",
  cancelled: "danger",
};
