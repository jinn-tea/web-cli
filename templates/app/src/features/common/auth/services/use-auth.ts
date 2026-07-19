"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_AUTHED_ROUTE } from "@/constants";
import { login } from "@/lib/auth";
import { useApiMutation } from "@/lib/mutations";
import type { LoginInput } from "@/features/common/auth/validations/auth.schema";

/**
 * Auth mutations.
 *
 * The session mechanics live in `lib/auth` (infrastructure); this layer is just
 * the React Query binding the screens call — which is why no other domain ever
 * has to import this feature.
 */
export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return useApiMutation<void, LoginInput>({
    mutationFn: async (input) => {
      await login(input);
    },
    successMessage: "auth.login.success",
    reportScope: "auth.login",
    onSuccess: () => {
      // Middleware stashed the original destination in `?next=` when it
      // bounced an unauthenticated user; honour it, but only for in-app paths
      // (an absolute URL here would be an open-redirect).
      const next = searchParams.get("next");
      const target =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : DEFAULT_AUTHED_ROUTE;
      router.replace(target);
    },
  });
}
