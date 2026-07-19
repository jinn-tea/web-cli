import { z } from "zod";
import { GENERIC_STATUSES } from "@/lib/badges";
import { nameField } from "@/validations/fields";

/**
 * Request schemas — the single source of truth for this domain's write shapes.
 *
 * The FORM validates with these and the REPOSITORY re-parses with the same
 * schema before the request leaves, so a form and its endpoint can't drift.
 * Messages are i18n keys.
 */

export const createOrderSchema = z.object({
  customerName: nameField,
  // z.enum over the same const tuple the union comes from — one source, so a
  // new status can't be valid in the type system and invalid at runtime.
  status: z.enum(GENERIC_STATUSES),
  total: z.coerce
    .number({ message: "validation.number" })
    .nonnegative("validation.number"),
});

/**
 * Two types, because `z.coerce` (and any `.transform`) makes a schema's INPUT
 * differ from its OUTPUT: an `<input type="number">` hands over a string, and
 * the schema turns it into a number.
 *
 *   *FormValues → what the form holds while the user types (z.input)
 *   *Input      → what the API receives after validation (z.output)
 *
 * `useForm<FormValues, unknown, Input>` connects them, so `handleSubmit` hands
 * the mutation a properly-typed payload. Getting this wrong is the usual cause
 * of "Resolver is not assignable" errors on any form with a number or date.
 */
export type CreateOrderFormValues = z.input<typeof createOrderSchema>;
export type CreateOrderInput = z.output<typeof createOrderSchema>;

export const updateOrderSchema = createOrderSchema.partial();

export type UpdateOrderFormValues = z.input<typeof updateOrderSchema>;
export type UpdateOrderInput = z.output<typeof updateOrderSchema>;
