import { useMemo } from "react";
import {
  ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight,
  Loader2, Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { type SortDir } from "@/lib/admin-query";
import { cn } from "@/lib/utils";

export type AdminColumn<T> = {
  id: string;
  header: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  cell: (row: T) => React.ReactNode;
  /** Shown as label in compact mobile rows */
  mobileLabel?: string;
  hideOnMobile?: boolean;
};

export type AdminDataTableProps<T> = {
  columns: AdminColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  sortColumn?: string;
  sortDir?: SortDir;
  onSortChange?: (column: string, dir: SortDir) => void;
  search?: string;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  bulkActions?: React.ReactNode;
  toolbar?: React.ReactNode;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  renderMobileRow?: (row: T) => React.ReactNode;
};

function SortIcon({ active, dir }: { active: boolean; dir?: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return dir === "asc"
    ? <ArrowUp className="h-3 w-3 text-primary-glow" />
    : <ArrowDown className="h-3 w-3 text-primary-glow" />;
}

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange: _onPageSizeChange,
  sortColumn,
  sortDir = "desc",
  onSortChange,
  search = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  loading = false,
  error = null,
  emptyMessage = "No records found.",
  selectable = false,
  selectedKeys,
  onSelectionChange,
  bulkActions,
  toolbar,
  title,
  subtitle,
  compact = true,
  renderMobileRow,
}: AdminDataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const keys = useMemo(() => rows.map(rowKey), [rows, rowKey]);
  const allSelected = keys.length > 0 && keys.every((k) => selectedKeys?.has(k));
  const someSelected = keys.some((k) => selectedKeys?.has(k));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys);
    if (allSelected) keys.forEach((k) => next.delete(k));
    else keys.forEach((k) => next.add(k));
    onSelectionChange(next);
  };

  const toggleOne = (key: string | number) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  const handleSort = (colId: string) => {
    if (!onSortChange) return;
    if (sortColumn === colId) {
      onSortChange(colId, sortDir === "asc" ? "desc" : "asc");
    } else {
      onSortChange(colId, "desc");
    }
  };

  const cellPad = compact ? "py-2 px-2" : "py-3 px-3";
  const headPad = compact ? "h-9 px-2" : "h-10 px-3";

  return (
    <div className={`rounded-xl border border-border/50 bg-card/40 overflow-hidden ${compact ? "" : "flex flex-col min-h-[calc(100vh-14rem)]"}`}>
      {(title || onSearchChange || filters || toolbar) && (
        <div className="border-b border-border/40 px-3 py-3 sm:px-4 space-y-2.5">
          {(title || subtitle) && (
            <div>
              {title && <h3 className="font-display font-semibold text-sm sm:text-base">{title}</h3>}
              {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
              {onSearchChange && (
                <div className="relative flex-1 min-w-[140px] max-w-sm">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-8 ps-8 pe-8 text-xs bg-background/60"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => onSearchChange("")}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
              {filters}
            </div>
            {toolbar && <div className="flex items-center gap-2 shrink-0">{toolbar}</div>}
          </div>
          {selectable && selectedKeys && selectedKeys.size > 0 && bulkActions && (
            <div className="flex items-center gap-2 pt-1 border-t border-border/30">
              <span className="text-xs text-muted-foreground">{selectedKeys.size} selected</span>
              {bulkActions}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="px-4 py-8 text-center text-sm text-destructive">{error}</div>
      )}

      {!error && loading && rows.length === 0 && (
        <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!error && !loading && rows.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>
      )}

      {!error && rows.length > 0 && (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…
              </div>
            </div>
          )}
          {/* Mobile */}
          <div className="md:hidden divide-y divide-border/30 max-h-[min(65vh,640px)] overflow-y-auto overscroll-contain">
            {rows.map((row) => {
              const key = rowKey(row);
              if (renderMobileRow) {
                return <div key={key} className="p-3">{renderMobileRow(row)}</div>;
              }
              return (
                <div key={key} className="p-3 space-y-1.5">
                  {selectable && (
                    <Checkbox
                      checked={selectedKeys?.has(key)}
                      onCheckedChange={() => toggleOne(key)}
                      className="mb-1"
                    />
                  )}
                  {columns.filter((c) => !c.hideOnMobile).map((col) => (
                    <div key={col.id} className="grid grid-cols-[minmax(4.5rem,38%)_1fr] gap-x-2 items-baseline text-xs">
                      <span className="text-muted-foreground text-[10px]">{col.mobileLabel ?? col.header}</span>
                      <span className="text-start min-w-0">{col.cell(row)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Desktop */}
          <div className={`hidden md:block overflow-auto overscroll-contain ${compact ? "max-h-[min(72vh,780px)]" : "min-h-[480px] max-h-[calc(100vh-18rem)] flex-1"}`}>
            <Table className="table-fixed">
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm shadow-[0_1px_0_0_hsl(var(--border)/0.4)]">
                <TableRow className="hover:bg-transparent border-border/40">
                  {selectable && (
                    <TableHead className={cn(headPad, "w-10")}>
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) (el as HTMLButtonElement).dataset.state = someSelected && !allSelected ? "indeterminate" : allSelected ? "checked" : "unchecked";
                        }}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                  )}
                  {columns.map((col) => (
                    <TableHead
                      key={col.id}
                      className={cn(
                        headPad,
                        "text-[10px] uppercase tracking-wider font-semibold text-muted-foreground whitespace-nowrap",
                        col.headerClassName,
                      )}
                    >
                      {col.sortable && onSortChange ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.id)}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {col.header}
                          <SortIcon active={sortColumn === col.id} dir={sortColumn === col.id ? sortDir : undefined} />
                        </button>
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const key = rowKey(row);
                  return (
                    <TableRow
                      key={key}
                      className={cn(
                        "border-border/20 text-xs hover:bg-secondary/25",
                        idx % 2 === 1 && "bg-secondary/5",
                      )}
                    >
                      {selectable && (
                        <TableCell className={cellPad}>
                          <Checkbox checked={selectedKeys?.has(key)} onCheckedChange={() => toggleOne(key)} />
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.id} className={cn(cellPad, col.className)}>
                          {col.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Footer: results + pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/40 px-3 py-2.5 sm:px-4 bg-secondary/5">
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {loading && rows.length === 0
            ? "Loading…"
            : total === 0
              ? "0 results"
              : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[11px] tabular-nums min-w-[4.5rem] text-center">
            {page.toLocaleString()} / {totalPages.toLocaleString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
