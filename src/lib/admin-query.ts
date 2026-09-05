/** Shared types for scalable admin list queries. */

export type SortDir = "asc" | "desc";

export type AdminListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  sortDir?: SortDir;
  status?: string;
  brand?: string;
  carId?: string;
};

export type PaginatedResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminListMeta = PaginatedResult<unknown> & {
  pendingCount?: number;
  statusCounts?: Record<string, number>;
};

export const ADMIN_PAGE_SIZES = [10, 20, 25, 50, 100] as const;
export const DEFAULT_ADMIN_PAGE_SIZE = 20;

export function normalizeAdminListQuery(
  input: AdminListQuery = {},
): Required<Pick<AdminListQuery, "page" | "pageSize">> & AdminListQuery {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(200, Math.max(5, input.pageSize ?? DEFAULT_ADMIN_PAGE_SIZE));
  return { ...input, page, pageSize };
}

export function paginatedOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/** Safe literal LIMIT/OFFSET — MySQL prepared statements reject bound LIMIT params. */
export function paginatedLimitSql(page: number, pageSize: number): string {
  const limit = Math.min(200, Math.max(5, Math.floor(pageSize)));
  const offset = Math.max(0, paginatedOffset(Math.max(1, Math.floor(page)), limit));
  return `LIMIT ${limit} OFFSET ${offset}`;
}
