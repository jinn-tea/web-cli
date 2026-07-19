"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { DataTableColumnHeader } from "@/components/shared/data-table";
import { RowActions } from "@/components/shared/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { TruncatedText } from "@/components/shared/truncated-text";
import type { TranslateFn } from "@/i18n";
import { GENERIC_STATUS_TONE } from "@/lib/badges";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/lib/datetime";
import type { Order } from "@/features/admin/orders/types";

/**
 * Column definitions, built by a factory rather than declared inline in the
 * screen: the screen then passes a stable, memoized array, and the table isn't
 * handed a brand-new column set on every render.
 *
 * `t` and the handlers come in as arguments so this file stays free of hooks
 * and is trivially unit-testable.
 */
export function buildOrderColumns({
  t,
  sort,
  onSortChange,
  onEdit,
  onDelete,
}: {
  t: TranslateFn;
  sort: string;
  onSortChange: (sort: string) => void;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
}): ColumnDef<Order, unknown>[] {
  return [
    {
      accessorKey: "reference",
      header: () => (
        <DataTableColumnHeader
          title={t("orders.columns.reference")}
          sortKey="reference"
          sort={sort}
          onSortChange={onSortChange}
        />
      ),
      cell: ({ row }) => (
        <span className="text-data">{row.original.reference}</span>
      ),
      size: 140,
    },
    {
      accessorKey: "customerName",
      header: () => (
        <DataTableColumnHeader
          title={t("orders.columns.customer")}
          sortKey="customerName"
          sort={sort}
          onSortChange={onSortChange}
        />
      ),
      // Customer names are user data and routinely long — always truncate with
      // an affordance rather than letting one row widen the whole table.
      cell: ({ row }) => <TruncatedText text={row.original.customerName} />,
    },
    {
      accessorKey: "status",
      header: () => (
        <DataTableColumnHeader title={t("orders.columns.status")} />
      ),
      cell: ({ row }) => (
        <StatusBadge tone={GENERIC_STATUS_TONE[row.original.status]}>
          {t(`orders.status.${row.original.status}`)}
        </StatusBadge>
      ),
      size: 140,
    },
    {
      accessorKey: "total",
      header: () => (
        <DataTableColumnHeader
          title={t("orders.columns.total")}
          sortKey="total"
          sort={sort}
          onSortChange={onSortChange}
          align="right"
        />
      ),
      cell: ({ row }) => (
        <span className="text-data block text-right">
          {formatCurrency(row.original.total, row.original.currency)}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <DataTableColumnHeader
          title={t("orders.columns.created")}
          sortKey="createdAt"
          sort={sort}
          onSortChange={onSortChange}
        />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
      size: 140,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">{t("common.table.openMenu")}</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActions
            actions={[
              {
                label: t("common.actions.edit"),
                icon: Pencil,
                onSelect: () => onEdit(row.original),
              },
              {
                label: t("common.actions.delete"),
                icon: Trash2,
                destructive: true,
                onSelect: () => onDelete(row.original),
              },
            ]}
          />
        </div>
      ),
      size: 64,
    },
  ];
}
