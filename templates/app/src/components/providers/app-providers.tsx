"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { bootstrapSession, initAuthTransport } from "@/lib/auth";
import { attachQueryErrorReporting, getQueryClient } from "@/lib/query-client";

/**
 * THE single client boundary of the app, mounted once by the root layout.
 *
 * Everything that needs browser context lives here so the rest of the tree can
 * stay Server Components. Adding `"use client"` further down is almost always a
 * mistake — check whether the component really needs state or effects first.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  // useState (not a module singleton) so React owns the instance across
  // Fast Refresh and Strict Mode double-invocation.
  const [queryClient] = useState(() => {
    const client = getQueryClient();
    attachQueryErrorReporting(client);
    return client;
  });

  useEffect(() => {
    // Teach the transport how to refresh, THEN restore any existing session
    // from the httpOnly cookie. Order matters: a 401 during bootstrap must
    // already have a refresher registered.
    initAuthTransport();
    void bootstrapSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
