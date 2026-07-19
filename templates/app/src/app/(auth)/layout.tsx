import { RequireGuest } from "@/lib/auth";

/**
 * Chrome for the signed-out screens: a centered card on the app canvas.
 *
 * `RequireGuest` bounces an already-signed-in user to the app, so the back
 * button can't land them on a login form they don't need.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireGuest>
      <div className="bg-canvas flex min-h-svh items-center justify-center p-4">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </RequireGuest>
  );
}
