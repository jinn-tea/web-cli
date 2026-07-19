"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { translate, type MessageKey } from "@/i18n";
import { getLocale } from "@/i18n/locale-store";
import { isAbortError, isApiError, isNetworkError } from "@/lib/http";
import { reportError } from "@/lib/reporting";

/**
 * Every mutation in this app goes through here.
 *
 * Written by hand, each mutation repeats the same four things — invalidate the
 * right keys, toast success, turn an error into a message a human can act on,
 * report it — and each one gets a slightly different subset wrong. This wraps
 * them once:
 *
 *  - `invalidate`: keys refetched on success, so no screen shows stale rows
 *  - `successMessage`: i18n key toasted on success
 *  - errors: `ApiError.message` (already localized by the backend) is shown
 *    instead of a generic "Something went wrong", and reported to the seam
 *
 * Anything unusual (optimistic updates, custom rollback) still passes through
 * via `options` — this adds behavior, it doesn't take any away.
 */

export interface ApiMutationOptions<TData, TVariables, TContext> extends Omit<
  UseMutationOptions<TData, unknown, TVariables, TContext>,
  "mutationFn"
> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Query keys to invalidate on success. */
  invalidate?: QueryKey[];
  /** i18n key toasted on success. Omit for mutations with visible results. */
  successMessage?: MessageKey;
  /** Set false to handle errors entirely in the caller. */
  showErrorToast?: boolean;
  /** Reporting label, e.g. "orders.create". */
  reportScope?: string;
}

/** Turn any thrown value into something worth showing a user. */
export function errorMessage(error: unknown): string {
  const locale = getLocale();
  if (isApiError(error)) return error.message;
  if (isNetworkError(error)) return translate(locale, "errors.network");
  return translate(locale, "errors.generic");
}

export function useApiMutation<
  TData = unknown,
  TVariables = void,
  TContext = unknown,
>({
  mutationFn,
  invalidate,
  successMessage,
  showErrorToast = true,
  reportScope,
  ...options
}: ApiMutationOptions<TData, TVariables, TContext>): UseMutationResult<
  TData,
  unknown,
  TVariables,
  TContext
> {
  const queryClient = useQueryClient();

  return useMutation<TData, unknown, TVariables, TContext>({
    ...options,
    mutationFn,
    // Rest args rather than a fixed arity: React Query has added callback
    // parameters within v5, and forwarding blindly keeps this working across
    // those bumps.
    onSuccess: async (...args) => {
      if (invalidate?.length) {
        await Promise.all(
          invalidate.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          ),
        );
      }
      if (successMessage) {
        toast.success(translate(getLocale(), successMessage));
      }
      await options.onSuccess?.(...args);
    },
    onError: (...args) => {
      const [error] = args;
      if (isAbortError(error)) return;
      reportError(error, { scope: reportScope ?? "mutation" });
      if (showErrorToast) toast.error(errorMessage(error));
      options.onError?.(...args);
    },
  });
}
