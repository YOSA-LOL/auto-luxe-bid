import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_ADMIN_PAGE_SIZE,
  type AdminListQuery,
  type PaginatedResult,
  type SortDir,
} from "@/lib/admin-query";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type UseAdminListOptions = {
  enabled?: boolean;
  initialSort?: string;
  initialSortDir?: SortDir;
  initialPageSize?: number;
  initialStatus?: string;
};

export function useAdminList<T, M extends PaginatedResult<T> = PaginatedResult<T>>(
  fetcher: (query: AdminListQuery) => Promise<M>,
  options: UseAdminListOptions = {},
) {
  const { enabled = true, initialSort = "created_at", initialSortDir = "desc", initialPageSize, initialStatus = "" } = options;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize ?? DEFAULT_ADMIN_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [sortColumn, setSortColumn] = useState(initialSort);
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir);
  const [status, setStatus] = useState(initialStatus);
  const [brand, setBrand] = useState("");
  const [carId, setCarId] = useState("");

  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<Omit<M, keyof PaginatedResult<T>>>({} as Omit<M, keyof PaginatedResult<T>>);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current({
        page,
        pageSize,
        search: debouncedSearch,
        sort: sortColumn,
        sortDir,
        status: status || undefined,
        brand: brand || undefined,
        carId: carId || undefined,
      });
      setRows(result.rows);
      setTotal(result.total);
      const { rows: _r, total: _t, page: _p, pageSize: _ps, ...rest } = result;
      setMeta(rest as Omit<M, keyof PaginatedResult<T>>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [enabled, page, pageSize, debouncedSearch, sortColumn, sortDir, status, brand, carId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, brand, carId, pageSize]);

  const onSortChange = (column: string, dir: SortDir) => {
    setSortColumn(column);
    setSortDir(dir);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setBrand("");
    setCarId("");
    setPage(1);
  };

  const hasFilters = Boolean(search || status || brand || carId);

  return {
    rows,
    total,
    meta,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    sortColumn,
    sortDir,
    onSortChange,
    status,
    setStatus,
    brand,
    setBrand,
    carId,
    setCarId,
    loading,
    error,
    reload: load,
    clearFilters,
    hasFilters,
  };
}
