import { AppShell } from "@/components/layout/app-shell";
import { RequireAuth } from "@/lib/auth";

/**
 * The authed shell. Every screen inside this route group is behind
 * `RequireAuth` — no page needs to guard itself, and none can forget to.
 *
 * Remember what this is and isn't: middleware already made an optimistic
 * cookie-level decision, and this makes the authoritative client-side one. The
 * BACKEND is the security boundary; both of these only decide what to render.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
