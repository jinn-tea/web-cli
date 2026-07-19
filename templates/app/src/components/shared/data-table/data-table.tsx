"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeletonRows } from "@/components/shared/table-skeleton-rows";
import type { Pagination } from "@/lib/http";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./data-table-pagination";

/**
 * The one table in this app.
 *
 * It owns every state a data surface needs — loading (layout-matching
 * skeletons), error (with retry), empty, and loaded — so a list screen can't
 * accidentally ship only the happy path. Sorting and pagination are
 * SERVER-DRIVEN and read from URL state (`useTableParams`), which is what makes
 * a filtered view shareable and back-button-friendly.
 *
 * Deliberately NOT client-side sorted/filtered: sorting one page of a paginated
 * result is a lie, and it's the single most common data-table bug.
 *
 * A domain list screen is then ~30 lines: columns + this component.
 */
export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];

  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;

  /** Shown when there are no rows and no error. */
  emptyState?: React.ReactNode;

  pagination?: Pagination;
  pageSize?: number;
  onPageChange?: (page: number) => void;

  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  className?: string;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  isFetching = false,
  isError = false,
  error,
  onRetry,
  emptyState,
  pagination,
  pageSize = 20,
  onPageChange,
  onRowClick,
  getRowId,
  className,
}: DataTableProps<TData>) {
  // React Compiler skips memoizing this component because useReactTable returns
  // functions it can't safely memoize. That's expected and harmless here: the
  // table is a leaf, its inputs come from URL state + a query, and every render
  // it does is one the data actually changed for. Keep column definitions in a
  // module-level constant (as the generated `*-columns.tsx` files do) so they
  // aren't rebuilt each render.
  // eslint-disable-next-line react-hooks/incompatible-library -- see above
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    getRowId: getRowId as ((row: TData, index: number) => string) | undefined,
  });

  const showSkeleton = isLoading;
  const showEmpty = !isLoading && !isError && data.length === 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="bg-card overflow-hidden rounded-lg border">
        {/* The scroll container: a wide table scrolls HERE, never pushing the
            page into horizontal scroll. */}
        <div className="relative w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.getSize()
                          ? `${header.getSize()}px`
                          : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody
              // Dim (don't unmount) while refetching, so a page change or a new
              // search doesn't blank the table the user is reading.
              className={cn(
                "transition-opacity",
                isFetching && !isLoading && "opacity-60",
              )}
            >
              {showSkeleton ? (
                <TableSkeletonRows columns={columns.length} />
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={
                      onRowClick ? () => onRowClick(row.original) : undefined
                    }
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {isError ? <ErrorState error={error} onRetry={onRetry} /> : null}
        {showEmpty ? (emptyState ?? <EmptyState title="—" />) : null}
      </div>

      {pagination && onPageChange ? (
        <DataTablePagination
          pagination={pagination}
          pageSize={pageSize}
          onPageChange={onPageChange}
          isPending={isFetching}
        />
      ) : null}
    </div>
  );
}
