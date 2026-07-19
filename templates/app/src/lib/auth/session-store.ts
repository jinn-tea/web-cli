"use client";

import { create } from "zustand";
import type { AuthUser, SessionStatus } from "./types";

/**
 * Session state — who is signed in, right now.
 *
 * DELIBERATELY NOT PERSISTED. The httpOnly refresh cookie is the durable source
 * of truth; the app re-derives the session from it on load. Persisting a user
 * object would create a second source of truth that can disagree with the
 * cookie (stale role after a permissions change, "signed in" UI with a dead
 * session) — the class of bug that's very hard to reproduce.
 *
 * This holds IDENTITY only. Server data belongs in React Query.
 */
interface SessionState {
  user: AuthUser | null;
  status: SessionStatus;
  setSession: (user: AuthUser) => void;
  clearSession: () => void;
  setUnauthenticated: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  status: "loading",
  setSession: (user) => set({ user, status: "authenticated" }),
  clearSession: () => set({ user: null, status: "unauthenticated" }),
  setUnauthenticated: () => set({ user: null, status: "unauthenticated" }),
}));

/** Read the current user outside React (rare — prefer the hooks). */
export function getCurrentUser(): AuthUser | null {
  return useSessionStore.getState().user;
}
