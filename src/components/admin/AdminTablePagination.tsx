import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

export function AdminTablePagination({
  page,
  pageSize,
  total,
  loading = false,
  onPageChange,
}: AdminTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4 pt-4 border-t border-border/30 shrink-0">
      <span className="text-xs text-muted-foreground tabular-nums">
        {loading ? "…" : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-9 w-9 p-0" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs tabular-nums min-w-[4rem] text-center font-medium">{page} / {totalPages}</span>
        <Button variant="outline" size="sm" className="h-9 w-9 p-0" disabled={page >= totalPages || loading} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
