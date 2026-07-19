"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_AUTHED_ROUTE } from "@/constants";
import { AUTH_ENDPOINTS, login } from "@/lib/auth";
import { backendClient } from "@/lib/http";
import { useApiMutation } from "@/lib/mutations";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
} from "@/features/common/auth/validations/auth.schema";

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

export function useRegister() {
  const router = useRouter();

  return useApiMutation<void, RegisterInput>({
    mutationFn: async (input) => {
      await backendClient.post(AUTH_ENDPOINTS.register, input, { auth: false });
      // Sign in straight away — asking someone to type the credentials they
      // just chose is friction with no security benefit.
      await login({ email: input.email, password: input.password });
    },
    successMessage: "auth.login.success",
    reportScope: "auth.register",
    onSuccess: () => router.replace(DEFAULT_AUTHED_ROUTE),
  });
}

export function useForgotPassword() {
  return useApiMutation<void, ForgotPasswordInput>({
    mutationFn: async (input) => {
      await backendClient.post(AUTH_ENDPOINTS.forgotPassword, input, {
        auth: false,
      });
    },
    // No toast: the screen swaps to a "check your inbox" state, and saying
    // more would reveal whether the address exists.
    showErrorToast: false,
    reportScope: "auth.forgotPassword",
  });
}
