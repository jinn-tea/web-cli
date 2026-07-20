/**
 * This domain's types, re-exported from the model that defines them.
 *
 * The shapes live in `models/order.model.ts` as Zod schemas, because they
 * describe data crossing a runtime boundary — a type alone is erased at build
 * time and checks nothing. This file keeps consumers importing from a stable
 * `types` path, and lets a type-only import stay type-only.
 *
 * Types stay private to the domain. One only moves up to `src/types/` when a
 * SECOND domain genuinely receives the same shape from the wire — promoting
 * speculatively is how a shared folder turns into a dumping ground.
 */
export type {
  Order,
  OrderListItem,
} from "@/features/admin/orders/models/order.model";
