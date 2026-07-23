/**
 * DEV-ONLY in-app network log — the web analog of Chucker's OkHttp interceptor.
 *
 * Every call that flows through `backendClient` records one entry here, so the
 * floating Network Inspector overlay can show what was sent, what came back, and
 * what failed — without opening the browser's Network tab.
 *
 * It is a bounded ring buffer with a tiny pub/sub (consumed via
 * `useSyncExternalStore`). Every writer is guarded by {@link isNetLogEnabled},
 * a compile-time constant that folds to `false` in production so the whole
 * mechanism — and the request/response bodies it would hold in memory — drops
 * out of prod builds. NEVER read this in product code; it exists only for the
 * inspector.
 */

export type NetErrorKind = "api" | "network" | "parse";

export interface NetLogEntry {
  id: number;
  method: string;
  path: string;
  /** HTTP status, or `null` when the request never reached the server. */
  status: number | null;
  ok: boolean;
  durationMs: number;
  /** Epoch ms when the request started. */
  startedAt: number;
  requestBody: unknown;
  /** Parsed `data` on success; a small error descriptor on failure. */
  response: unknown;
  errorKind?: NetErrorKind;
  errorMessage?: string;
}

/**
 * Statically `false` in production → every writer and the buffer tree-shake out.
 * Also off on the server: only the browser mounts the inspector that reads this.
 */
export const isNetLogEnabled =
  process.env.NODE_ENV !== "production" && typeof window !== "undefined";

const MAX_ENTRIES = 100;

let entries: NetLogEntry[] = [];
let sequence = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Append a call to the log (newest first, capped at {@link MAX_ENTRIES}).
 * No-op in production. Returns the stored entry (with its id) or `null`.
 */
export function recordNetCall(
  entry: Omit<NetLogEntry, "id">,
): NetLogEntry | null {
  if (!isNetLogEnabled) return null;
  const stored: NetLogEntry = { ...entry, id: ++sequence };
  entries = [stored, ...entries].slice(0, MAX_ENTRIES);
  emit();
  return stored;
}

export function clearNetLog(): void {
  entries = [];
  emit();
}

/** Stable snapshot for `useSyncExternalStore` — reference changes only on write. */
export function getNetLog(): NetLogEntry[] {
  return entries;
}

export function subscribeNetLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
