"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormActions } from "@/components/form/form-actions";
import { FormDialog } from "@/components/form/form-dialog";
import { SelectField } from "@/components/form/select-field";
import { TextField } from "@/components/form/text-field";
import { useTranslations } from "@/i18n";
import { useRoleGroup } from "@/lib/auth";
import { GENERIC_STATUSES } from "@/lib/badges";
import {
  createOrderSchema,
  type CreateOrderFormValues,
  type CreateOrderInput,
} from "@/features/admin/orders/validations/orders.schema";
import {
  useCreateOrder,
  useUpdateOrder,
} from "@/features/admin/orders/services/use-orders";
import type { Order } from "@/features/admin/orders/types";

/**
 * Create/edit dialog. One component serves both modes — a separate "edit"
 * dialog is the same form with different defaults, and keeping them together is
 * what stops the two from drifting.
 */
export function OrderFormDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit mode. */
  order?: Order | null;
}) {
  const t = useTranslations();
  const group = useRoleGroup();
  const createMutation = useCreateOrder(group);
  const updateMutation = useUpdateOrder(group);

  const isEdit = Boolean(order);
  const isPending = createMutation.isPending || updateMutation.isPending;

  // <FormValues, context, TransformedValues> — see the schema file for why the
  // input and output types differ.
  const form = useForm<CreateOrderFormValues, unknown, CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { customerName: "", status: "draft", total: 0 },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  // Re-seed when the dialog opens or the target changes; a form kept mounted
  // across openings would otherwise show the previous record's values.
  useEffect(() => {
    if (!open) return;
    form.reset(
      order
        ? {
            customerName: order.customerName,
            status: order.status,
            total: order.total,
          }
        : { customerName: "", status: "draft", total: 0 },
    );
  }, [open, order, form]);

  const onSubmit = form.handleSubmit((values) => {
    const onSuccess = () => onOpenChange(false);
    if (order) {
      updateMutation.mutate({ id: order.id, input: values }, { onSuccess });
    } else {
      createMutation.mutate(values, { onSuccess });
    }
  });

  const statusOptions = GENERIC_STATUSES.map((status) => ({
    value: status,
    label: t(`orders.status.${status}`),
  }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("orders.editTitle") : t("orders.createTitle")}
      description={t("orders.formHint")}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          control={form.control}
          name="customerName"
          label={t("orders.columns.customer")}
          autoFocus
        />
        <SelectField
          control={form.control}
          name="status"
          label={t("orders.columns.status")}
          options={statusOptions}
        />
        <TextField
          control={form.control}
          name="total"
          label={t("orders.columns.total")}
          type="number"
          inputMode="decimal"
        />
        <FormActions
          isPending={isPending}
          onCancel={() => onOpenChange(false)}
          submitLabel={
            isEdit ? t("common.actions.save") : t("common.actions.create")
          }
        />
      </form>
    </FormDialog>
  );
}
