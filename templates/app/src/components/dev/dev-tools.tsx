"use client";

import { NetworkInspector } from "./network-inspector";

/**
 * DEV-ONLY tooling, mounted once by `AppProviders`.
 *
 * Just the {@link NetworkInspector} — a Chucker-style chronological HTTP log
 * with request/response bodies and failure toasts. `AppProviders` imports this
 * lazily behind a `NODE_ENV` check, so it never reaches the production bundle.
 */
export function DevTools() {
  return <NetworkInspector />;
}
