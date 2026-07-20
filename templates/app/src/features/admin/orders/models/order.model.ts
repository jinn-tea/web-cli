import { z } from "zod";
import { GENERIC_STATUSES } from "@/lib/badges";

/**
 * The Order MODEL — what the backend actually returns.
 *
 * The schema is the source of truth and the type is derived from it, never the
 * other way round. Write the shape once and `z.infer` keeps the type honest;
 * hand-writing an interface next to a parser is how the two silently drift.
 *
 * This is the INBOUND counterpart to `validations/` (which describes what a
 * form sends). They differ on purpose — a create payload has no `id` and no
 * `createdAt`, and the wire model has no i18n message keys.
 *
 * The repository passes `orderSchema.parse` to the transport, so a response
 * that doesn't match fails at the boundary naming the exact field, instead of
 * putting `undefined` into a component and crashing somewhere unrelated.
 *
 * When the backend is ahead of you, or a field is unreliable:
 *   .optional()          tolerate a field that isn't rolled out everywhere yet
 *   .nullable()          the backend genuinely sends null
 *   .catch(fallback)     accept anything, fall back rather than fail
 * Unknown keys are stripped by default, so the backend ADDING fields never
 * breaks you — only a field you rely on changing shape does.
 */
export const orderSchema = z.object({
  id: z.string(),
  reference: z.string(),
  customerName: z.string(),
  // Same const tuple the UI's tone map is keyed off, so a status the backend
  // invents can't reach `GENERIC_STATUS_TONE` and render as undefined.
  status: z.enum(GENERIC_STATUSES),
  total: z.number(),
  currency: z.string(),
  createdAt: z.string(),
  /** Detail-only: not worth sending down for every row of a table. */
  notes: z.string().nullable().default(null),
  updatedAt: z.string(),
});

export type Order = z.infer<typeof orderSchema>;

/**
 * What a LIST row needs — deliberately narrower than the full model.
 *
 * Model the response, not the entity. If one shared shape had to satisfy every
 * endpoint, a single detail screen's new field would force the backend to
 * enrich every list endpoint that returns an Order. Narrowing here is what
 * stops a frontend model from dictating backend responses.
 *
 * `.pick()` derives it, so a rename in the model above can't leave this stale.
 */
export const orderListItemSchema = orderSchema.pick({
  id: true,
  reference: true,
  customerName: true,
  status: true,
  total: true,
  currency: true,
  createdAt: true,
});

export type OrderListItem = z.infer<typeof orderListItemSchema>;
