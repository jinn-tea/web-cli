import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

/**
 * Loading rows shaped like the real rows.
 *
 * A centered spinner for a table is a downgrade: the page height jumps when
 * data lands (layout shift), and the user learns nothing while waiting. Rows of
 * the right count and width keep the layout stable and telegraph what's coming.
 */
export function TableSkeletonRows({
  rows = 8,
  columns,
}: {
  rows?: number;
  columns: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <TableCell key={columnIndex} className="py-3">
              {/* Vary width so it reads as content, not a loading bar. */}
              <Skeleton
                className="h-4"
                style={{ width: `${[70, 45, 60, 35, 55][columnIndex % 5]}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
