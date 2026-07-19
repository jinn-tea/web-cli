"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS, type RoleGroup } from "@/constants";
import { ordersRepository } from "@/features/admin/orders/api/orders.repository";
import type {
  CreateOrderInput,
  UpdateOrderInput,
} from "@/features/admin/orders/validations/orders.schema";
import { useApiMutation } from "@/lib/mutations";

/**
 * React Query bindings for the orders domain.
 *
 * The components never touch the repository or the transport — they call these
 * hooks, which own caching, invalidation, and the standard toast/error
 * behavior via `useApiMutation`.
 */

interface ListParams {
  page?: number;
  q?: string;
  sort?: string;
}

export function useOrders(group: RoleGroup | null, params: ListParams) {
  return useQuery({
    // Role-group-scoped: an admin's cache can never serve a member's rows.
    queryKey: QUERY_KEYS.orders.list(group ?? "admin", params),
    // Forward `signal` so a superseded search is actually aborted, not merely
    // ignored when it lands.
    queryFn: ({ signal }) =>
      ordersRepository.list(group as RoleGroup, params, { signal }),
    // Gate on the role group: firing with `undefined` would request `/null/orders`.
    enabled: group !== null,
    // Keep the previous page on screen while the next one loads, so paging and
    // typing don't flash an empty table.
    placeholderData: (previous) => previous,
  });
}

export function useCreateOrder(group: RoleGroup | null) {
  return useApiMutation<unknown, CreateOrderInput>({
    mutationFn: (input) => ordersRepository.create(group as RoleGroup, input),
    invalidate: [QUERY_KEYS.orders.all],
    successMessage: "orders.created",
    reportScope: "orders.create",
  });
}

export function useUpdateOrder(group: RoleGroup | null) {
  return useApiMutation<unknown, { id: string; input: UpdateOrderInput }>({
    mutationFn: ({ id, input }) =>
      ordersRepository.update(group as RoleGroup, id, input),
    invalidate: [QUERY_KEYS.orders.all],
    successMessage: "orders.updated",
    reportScope: "orders.update",
  });
}

export function useDeleteOrder(group: RoleGroup | null) {
  return useApiMutation<void, string>({
    mutationFn: (id) => ordersRepository.remove(group as RoleGroup, id),
    invalidate: [QUERY_KEYS.orders.all],
    successMessage: "orders.deleted",
    reportScope: "orders.delete",
  });
}
