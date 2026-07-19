"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n";
import type { Pagination } from "@/lib/http";
import { formatNumber } from "@/lib/format";

/**
 * Pagination controls for a server-paginated table.
 *
 * Shows the range and total, not just arrows: "41–60 of 312" tells the user
 * where they are and how much is left, which bare next/previous buttons never do.
 */
export interface DataTablePaginationProps {
  pagination: Pagination;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Disable while a page is in flight to prevent double-jumps. */
  isPending?: boolean;
}

export function DataTablePagination({
  pagination,
  pageSize,
  onPageChange,
  isPending = false,
}: DataTablePaginationProps) {
  const t = useTranslations();
  const { currentPage, totalPages, totalItems } = pagination;

  if (totalItems === 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
      <p className="text-caption text-muted-foreground">
        {t("common.pagination.summary", {
          from: formatNumber(from),
          to: formatNumber(to),
          total: formatNumber(totalItems),
        })}
      </p>

      <div className="flex items-center gap-2">
        <span className="text-caption text-muted-foreground hidden sm:inline">
          {t("common.pagination.page", {
            page: currentPage,
            pages: Math.max(totalPages, 1),
          })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">
            {t("common.pagination.previous")}
          </span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
        >
          <span className="sr-only sm:not-sr-only">
            {t("common.pagination.next")}
          </span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
