import type { RoleGroup } from "@/constants";
import {
  backendClient,
  normalizePagination,
  type Paginated,
  type RawPagination,
  type RequestOptions,
} from "@/lib/http";
import { ordersEndpoints } from "@/features/admin/orders/constants";
import {
  createOrderSchema,
  updateOrderSchema,
  type CreateOrderInput,
  type UpdateOrderInput,
} from "@/features/admin/orders/validations/orders.schema";
import type { Order } from "@/features/admin/orders/types";

/**
 * The repository — this domain's boundary with the backend.
 *
 * It is PURE: validate input with the schema → call the transport → return a
 * typed domain object. No React, no toasts, no token handling, no caching. That
 *'s what makes it trivially testable and reusable from anywhere.
 *
 * Note `signal` is threaded through every read. Without it React Query cannot
 * actually abort a superseded request, so a slow response from an old search
 * can land after a newer one and overwrite it.
 */

interface ListParams {
  page?: number;
  q?: string;
  sort?: string;
}

/** Raw list shape from the backend (snake_case pagination). */
interface RawOrderList {
  items: Order[];
  pagination: RawPagination;
}

function buildQuery(params: ListParams): string {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.q) search.set("q", params.q);
  if (params.sort) search.set("sort", params.sort);
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const ordersRepository = {
  async list(
    group: RoleGroup,
    params: ListParams = {},
    opts?: RequestOptions,
  ): Promise<Paginated<Order>> {
    const raw = await backendClient.get<RawOrderList>(
      `${ordersEndpoints(group).list}${buildQuery(params)}`,
      opts,
    );
    // snake_case → camelCase happens HERE, at the edge, so no component ever
    // sees `current_page`.
    return {
      items: raw.items ?? [],
      pagination: normalizePagination(raw.pagination ?? {}),
    };
  },

  detail(group: RoleGroup, id: string, opts?: RequestOptions): Promise<Order> {
    return backendClient.get<Order>(ordersEndpoints(group).detail(id), opts);
  },

  create(
    group: RoleGroup,
    input: CreateOrderInput,
    opts?: RequestOptions,
  ): Promise<Order> {
    // Parse before sending: the form validated already, but a repository that
    // trusts its caller is one refactor away from posting garbage.
    const body = createOrderSchema.parse(input);
    return backendClient.post<Order>(ordersEndpoints(group).create, body, opts);
  },

  update(
    group: RoleGroup,
    id: string,
    input: UpdateOrderInput,
    opts?: RequestOptions,
  ): Promise<Order> {
    const body = updateOrderSchema.parse(input);
    return backendClient.patch<Order>(
      ordersEndpoints(group).update(id),
      body,
      opts,
    );
  },

  remove(group: RoleGroup, id: string, opts?: RequestOptions): Promise<void> {
    return backendClient.delete<void>(ordersEndpoints(group).remove(id), opts);
  },
};
