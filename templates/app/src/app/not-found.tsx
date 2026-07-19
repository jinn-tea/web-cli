import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DEFAULT_AUTHED_ROUTE } from "@/constants";

/**
 * 404. A Server Component, so the copy can't come from the client-only `t()` —
 * this is one of the few places English lives in a page file. When you add a
 * second locale, move these strings behind a server-side translator.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-overline">404</p>
      <h1 className="text-h1">Page not found</h1>
      <p className="text-body text-muted-foreground max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Button asChild className="mt-2">
        <Link href={DEFAULT_AUTHED_ROUTE}>Go to dashboard</Link>
      </Button>
    </div>
  );
}
