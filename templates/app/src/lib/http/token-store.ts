/**
 * Canonical holder for the **access token**, and the only place it lives.
 *
 * Deliberately MEMORY-ONLY (BFF auth model): the long-lived refresh token sits
 * in an httpOnly cookie the browser cannot read, and the short-lived access
 * token never touches `localStorage` — so an XSS payload cannot exfiltrate a
 * durable session. On a reload the app re-derives an access token by calling
 * `/api/session/refresh`, which succeeds purely because the cookie rides along.
 *
 * Framework-agnostic on purpose (no React) so the transport can read it.
 *
 * NOTE: with `--auth client` the CLI swaps this file for a localStorage-backed
 * variant with the identical interface; nothing else in the app changes.
 */

let accessToken: string | null = null;

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },

  set(token: string | null): void {
    accessToken = token;
    listeners.forEach((listener) => listener(accessToken));
  },

  clear(): void {
    this.set(null);
  },

  /** Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
