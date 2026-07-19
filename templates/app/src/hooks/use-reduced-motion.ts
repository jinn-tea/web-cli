"use client";

import { useSyncExternalStore } from "react";

/**
 * Respect the OS "reduce motion" setting. Any non-essential animation should
 * check this and fall back to an instant state change.
 *
 * Implemented with `useSyncExternalStore` rather than `useEffect` + `useState`:
 * a media query IS an external store, and this is the primitive built for
 * subscribing to one. It also avoids the cascading render that setting state
 * inside an effect causes, and gives a correct server snapshot for free.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** On the server, assume motion is allowed; the client corrects on hydration. */
function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
