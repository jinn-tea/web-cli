import type { RoleGroup } from "@/constants";
import {
  backendClient,
  normalizePagination,
  paginatedResponseSchema,
  type Paginated,
  type RequestOptions,
} from "@/lib/http";
import { ordersEndpoints } from "@/features/admin/orders/constants";
import {
  createOrderSchema,
  updateOrderSchema,
  type CreateOrderInput,
  type UpdateOrderInput,
} from "@/features/admin/orders/validations/orders.schema";
import {
  orderSchema,
  orderListItemSchema,
  type Order,
  type OrderListItem,
} from "@/features/admin/orders/models/order.model";

/**
 * The repository — this domain's boundary with the backend.
 *
 * It is PURE: validate input with the schema → call the transport → parse the
 * response into a typed domain object. No React, no toasts, no token handling,
 * no caching. That's what makes it trivially testable and reusable from
 * anywhere.
 *
 * Validation runs in BOTH directions, and the inbound half is the one usually
 * skipped: a bare `backendClient.get<Order>(…)` is a claim about the response
 * that nothing verifies, so a renamed backend field arrives as `undefined` in a
 * component instead of an error here. Passing `parse` makes the type true at
 * runtime — `jinn-web doctor` flags any call that omits it.
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

/**
 * The list response: rows plus the backend's snake_case pagination block.
 * Built from the LIST-ROW schema, not the full model — see the model file for
 * why those are deliberately different shapes.
 */
const ordersListResponseSchema = paginatedResponseSchema(orderListItemSchema);

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
  ): Promise<Paginated<OrderListItem>> {
    const raw = await backendClient.get(
      `${ordersEndpoints(group).list}${buildQuery(params)}`,
      { ...opts, parse: ordersListResponseSchema.parse },
    );
    // snake_case → camelCase happens HERE, at the edge, so no component ever
    // sees `current_page`.
    return {
      items: raw.items,
      pagination: normalizePagination(raw.pagination),
    };
  },

  detail(group: RoleGroup, id: string, opts?: RequestOptions): Promise<Order> {
    return backendClient.get(ordersEndpoints(group).detail(id), {
      ...opts,
      parse: orderSchema.parse,
    });
  },

  create(
    group: RoleGroup,
    input: CreateOrderInput,
    opts?: RequestOptions,
  ): Promise<Order> {
    // Parse before sending: the form validated already, but a repository that
    // trusts its caller is one refactor away from posting garbage.
    const body = createOrderSchema.parse(input);
    return backendClient.post(ordersEndpoints(group).create, body, {
      ...opts,
      parse: orderSchema.parse,
    });
  },

  update(
    group: RoleGroup,
    id: string,
    input: UpdateOrderInput,
    opts?: RequestOptions,
  ): Promise<Order> {
    const body = updateOrderSchema.parse(input);
    return backendClient.patch(ordersEndpoints(group).update(id), body, {
      ...opts,
      parse: orderSchema.parse,
    });
  },

  remove(group: RoleGroup, id: string, opts?: RequestOptions): Promise<void> {
    // No `parse`: a delete answers with an empty envelope, so there is no shape
    // to check. The absence is deliberate — doctor allows it for `delete`.
    return backendClient.delete<void>(
      ordersEndpoints(group).remove(id),
      undefined,
      opts,
    );
  },
};
