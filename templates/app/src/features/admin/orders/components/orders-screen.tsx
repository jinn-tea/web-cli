"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { useTableParams } from "@/hooks/use-table-params";
import { useTranslations } from "@/i18n";
import { useRoleGroup } from "@/lib/auth";
import { ORDERS_PAGE_SIZE } from "@/features/admin/orders/constants";
import { buildOrderColumns } from "@/features/admin/orders/components/orders-columns";
import { OrderFormDialog } from "@/features/admin/orders/components/order-form-dialog";
import {
  useDeleteOrder,
  useOrders,
} from "@/features/admin/orders/services/use-orders";
import type { Order } from "@/features/admin/orders/types";

/**
 * The reference list screen — what `codeable-web domain` generates.
 *
 * Note what ISN'T here: no fetch, no loading/error/empty branching, no
 * pagination wiring, no sort state. `DataTable` owns the states, `useTableParams`
 * owns the URL state, and the hooks own the data — so the screen is only
 * composition and the handful of decisions that are genuinely domain-specific.
 */
export function OrdersScreen() {
  const t = useTranslations();
  const group = useRoleGroup();
  const { params, queryParams, setPage, setQuery, setSort } = useTableParams();

  const [editing, setEditing] = useState<Order | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Order | null>(null);

  const ordersQuery = useOrders(group, queryParams);
  const deleteMutation = useDeleteOrder(group);

  const columns = useMemo(
    () =>
      buildOrderColumns({
        t,
        sort: params.sort,
        onSortChange: setSort,
        onEdit: (order) => {
          setEditing(order);
          setIsFormOpen(true);
        },
        onDelete: setDeleting,
      }),
    [t, params.sort, setSort],
  );

  const handleCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
    });
  };

  return (
    <>
      <PageHeader
        title={t("orders.title")}
        description={t("orders.subtitle")}
        action={
          <Button onClick={handleCreate}>
            <Plus className="size-4" aria-hidden="true" />
            {t("orders.create")}
          </Button>
        }
      />

      <div className="mb-3 max-w-xs">
        <SearchInput
          value={params.q}
          onChange={setQuery}
          placeholder={t("orders.searchPlaceholder")}
        />
      </div>

      <DataTable
        columns={columns}
        data={ordersQuery.data?.items ?? []}
        isLoading={ordersQuery.isLoading}
        isFetching={ordersQuery.isFetching}
        isError={ordersQuery.isError}
        error={ordersQuery.error}
        onRetry={() => void ordersQuery.refetch()}
        pagination={ordersQuery.data?.pagination}
        pageSize={ORDERS_PAGE_SIZE}
        onPageChange={setPage}
        getRowId={(order) => order.id}
        emptyState={
          // "No results for this filter" and "nothing exists yet" need
          // different next steps — don't collapse them into one message.
          params.q ? (
            <EmptyState
              title={t("common.states.noResults")}
              hint={t("common.states.noResultsHint")}
            />
          ) : (
            <EmptyState
              title={t("orders.empty")}
              hint={t("orders.emptyHint")}
              action={
                <Button onClick={handleCreate}>
                  <Plus className="size-4" aria-hidden="true" />
                  {t("orders.create")}
                </Button>
              }
            />
          )
        }
      />

      <OrderFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        order={editing}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("orders.deleteTitle")}
        description={t("common.confirm.deleteDescription")}
        confirmLabel={t("common.actions.delete")}
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
