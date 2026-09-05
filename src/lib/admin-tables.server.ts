/**
 * Paginated admin data queries — server-side search, filter, sort, pagination.
 */
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./db.server";
import { requireAdminEmail } from "./admin.server";
import type { AdminListQuery, PaginatedResult } from "./admin-query";
import { normalizeAdminListQuery, paginatedLimitSql } from "./admin-query";
import type { DbCar } from "./types";
import type { DbUser } from "./cars.server";
import type { AuctionEntryRequest } from "./auction-entry.server";
import type { ActivityLogEntry, AdminBidRow } from "./admin.server";
import { getFinancialSummary } from "./admin.server";

type QueryInput = AdminListQuery;

function buildSearchWhere(
  fields: string[],
  search: string | undefined,
  params: unknown[],
): string {
  const q = search?.trim();
  if (!q) return "";
  const like = `%${q}%`;
  const clauses = fields.map((f) => {
    params.push(like);
    return `${f} LIKE $${params.length}`;
  });
  return `(${clauses.join(" OR ")})`;
}

const CAR_SORT: Record<string, string> = {
  title: "c.title",
  brand: "c.brand",
  price: "c.price",
  created_at: "c.created_at",
  ends_at: "c.ends_at",
  city: "c.city",
};

export const queryAdminCars = createServerFn()
  .inputValidator((input: QueryInput) => normalizeAdminListQuery(input))
  .handler(async ({ data: q }): Promise<PaginatedResult<DbCar & { bids_count: number }>> => {
    await requireAdminEmail();
    const db = getDb();
    const params: unknown[] = [];
    const where: string[] = [];

    const searchClause = buildSearchWhere(
      ["c.title", "c.brand", "c.model", "c.city", "c.id"],
      q.search,
      params,
    );
    if (searchClause) where.push(searchClause);

    if (q.brand) {
      params.push(q.brand);
      where.push(`c.brand = $${params.length}`);
    }

    if (q.status === "live") where.push("c.is_live = 1 AND c.is_sold = 0");
    else if (q.status === "showroom") where.push("c.is_live = 0 AND c.is_sold = 0 AND COALESCE(c.is_visible, 1) = 1");
    else if (q.status === "listed") where.push("c.is_live = 0 AND c.is_sold = 0");
    else if (q.status === "hidden") where.push("c.is_sold = 0 AND COALESCE(c.is_visible, 1) = 0");
    else if (q.status === "sold") where.push("c.is_sold = 1");

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sortCol = CAR_SORT[q.sort ?? "created_at"] ?? "c.created_at";
    const sortDir = q.sortDir === "asc" ? "ASC" : "DESC";
    const limitSql = paginatedLimitSql(q.page!, q.pageSize!);

    const { rows: countRows } = await db.query<{ total: number }>(
      `SELECT COUNT(DISTINCT c.id) AS total FROM cars c ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const { rows } = await db.query<DbCar & { bids_count: number }>(
      `SELECT c.*, COUNT(b.id) AS bids_count
       FROM cars c
       LEFT JOIN bids b ON b.car_id = c.id
       ${whereSql}
       GROUP BY c.id
       ORDER BY ${sortCol} ${sortDir}
       ${limitSql}`,
      params,
    );

    return {
      rows: rows.map((r) => ({ ...r, bids_count: Number(r.bids_count) })),
      total,
      page: q.page!,
      pageSize: q.pageSize!,
    };
  });

export const queryAdminSoldCars = createServerFn()
  .inputValidator((input: QueryInput) => normalizeAdminListQuery(input))
  .handler(async ({ data: q }): Promise<PaginatedResult<DbCar & { bids_count: number }>> => {
    await requireAdminEmail();
    const db = getDb();
    const params: unknown[] = [];
    const where: string[] = ["c.is_sold = 1"];

    const searchClause = buildSearchWhere(
      ["c.title", "c.brand", "c.model", "c.city"],
      q.search,
      params,
    );
    if (searchClause) where.push(searchClause);

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const limitSql = paginatedLimitSql(q.page!, q.pageSize!);

    const { rows: countRows } = await db.query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM cars c ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const { rows } = await db.query<DbCar & { bids_count: number }>(
      `SELECT c.*, COUNT(b.id) AS bids_count
       FROM cars c
       LEFT JOIN bids b ON b.car_id = c.id
       ${whereSql}
       GROUP BY c.id
       ORDER BY c.sold_at IS NULL ASC, c.sold_at DESC
       ${limitSql}`,
      params,
    );

    return {
      rows: rows.map((r) => ({ ...r, bids_count: Number(r.bids_count) })),
      total,
      page: q.page!,
      pageSize: q.pageSize!,
    };
  });

export type AdminUserRow = DbUser & {
  bids_count: number;
  deposits_count: number;
  wins_count: number;
};

export const queryAdminUsers = createServerFn()
  .inputValidator((input: QueryInput) => normalizeAdminListQuery(input))
  .handler(async ({ data: q }): Promise<PaginatedResult<AdminUserRow>> => {
    await requireAdminEmail();
    const db = getDb();
    const params: unknown[] = [];
    const where: string[] = [];

    const searchClause = buildSearchWhere(
      ["u.name", "u.email", "u.phone"],
      q.search,
      params,
    );
    if (searchClause) where.push(searchClause);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sortCol = q.sort === "name" ? "u.name" : q.sort === "email" ? "u.email" : "u.created_at";
    const sortDir = q.sortDir === "asc" ? "ASC" : "DESC";
    const limitSql = paginatedLimitSql(q.page!, q.pageSize!);

    const { rows: countRows } = await db.query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM users u ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const { rows } = await db.query<AdminUserRow>(
      `SELECT u.id, u.clerk_id, u.name, u.email, u.phone, u.created_at,
              (SELECT COUNT(*) FROM bids b WHERE b.user_email = u.email OR (b.user_email IS NULL AND b.user_name = u.name)) AS bids_count,
              (SELECT COUNT(*) FROM deposits d WHERE d.user_email = u.email AND d.status = 'paid') AS deposits_count,
              (SELECT COUNT(*) FROM cars c WHERE c.winner_email = u.email) AS wins_count
       FROM users u
       ${whereSql}
       ORDER BY ${sortCol} ${sortDir}
       ${limitSql}`,
      params,
    );

    return {
      rows: rows.map((r) => ({
        ...r,
        bids_count: Number(r.bids_count),
        deposits_count: Number(r.deposits_count),
        wins_count: Number(r.wins_count),
      })),
      total,
      page: q.page!,
      pageSize: q.pageSize!,
    };
  });

export const queryAdminEntryRequests = createServerFn()
  .inputValidator((input: QueryInput) => normalizeAdminListQuery(input))
  .handler(async ({ data: q }): Promise<PaginatedResult<AuctionEntryRequest> & { pendingCount: number }> => {
    await requireAdminEmail();
    const db = getDb();
    const params: unknown[] = [];
    const where: string[] = [];

    const searchClause = buildSearchWhere(
      ["user_name", "user_email", "car_title", "car_id"],
      q.search,
      params,
    );
    if (searchClause) where.push(searchClause);

    if (q.status) {
      params.push(q.status);
      where.push(`status = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limitSql = paginatedLimitSql(q.page!, q.pageSize!);

    const { rows: countRows } = await db.query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM auction_entry_requests ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const { rows: pendingRows } = await db.query<{ c: number }>(
      `SELECT COUNT(*) AS c FROM auction_entry_requests WHERE status = 'pending'`,
    );
    const pendingCount = Number(pendingRows[0]?.c ?? 0);

    const { rows } = await db.query<AuctionEntryRequest>(
      `SELECT * FROM auction_entry_requests ${whereSql}
       ORDER BY created_at DESC
       ${limitSql}`,
      params,
    );

    return { rows, total, page: q.page!, pageSize: q.pageSize!, pendingCount };
  });

export const queryAdminBids = createServerFn()
  .inputValidator((input: QueryInput) => normalizeAdminListQuery(input))
  .handler(async ({ data: q }): Promise<PaginatedResult<AdminBidRow>> => {
    await requireAdminEmail();
    const db = getDb();
    const params: unknown[] = [];
    const where: string[] = [];

    if (q.carId) {
      params.push(q.carId);
      where.push(`b.car_id = $${params.length}`);
    }

    const searchClause = buildSearchWhere(
      ["b.user_name", "c.title", "c.brand"],
      q.search,
      params,
    );
    if (searchClause) where.push(searchClause);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sortCol = q.sort === "amount" ? "b.amount" : "b.created_at";
    const sortDir = q.sortDir === "asc" ? "ASC" : "DESC";
    const limitSql = paginatedLimitSql(q.page!, q.pageSize!);

    const { rows: countRows } = await db.query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM bids b JOIN cars c ON c.id = b.car_id ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const { rows } = await db.query<AdminBidRow>(
      `SELECT b.*, c.title AS car_title, c.brand AS car_brand, c.is_live
       FROM bids b
       JOIN cars c ON c.id = b.car_id
       ${whereSql}
       ORDER BY ${sortCol} ${sortDir}
       ${limitSql}`,
      params,
    );

    return { rows, total, page: q.page!, pageSize: q.pageSize! };
  });

export const queryAdminActivity = createServerFn()
  .inputValidator((input: QueryInput) => normalizeAdminListQuery(input))
  .handler(async ({ data: q }): Promise<PaginatedResult<ActivityLogEntry>> => {
    await requireAdminEmail();
    const db = getDb();
    const params: unknown[] = [];
    const where: string[] = [];

    const searchClause = buildSearchWhere(
      ["admin_email", "action", "details", "entity_id"],
      q.search,
      params,
    );
    if (searchClause) where.push(searchClause);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limitSql = paginatedLimitSql(q.page!, q.pageSize!);

    const { rows: countRows } = await db.query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM activity_log ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const { rows } = await db.query<ActivityLogEntry>(
      `SELECT * FROM activity_log ${whereSql}
       ORDER BY created_at DESC
       ${limitSql}`,
      params,
    );

    return { rows, total, page: q.page!, pageSize: q.pageSize! };
  });

export const queryAdminExpired = createServerFn()
  .inputValidator((input: QueryInput) => normalizeAdminListQuery(input))
  .handler(async ({ data: q }): Promise<PaginatedResult<DbCar & { bids_count: number; reserve_met: boolean }>> => {
    await requireAdminEmail();
    const db = getDb();
    const params: unknown[] = [];
    const where: string[] = [
      "c.is_sold = 0",
      "c.is_live = 0",
      "(c.auction_status IN ('ended','ended_with_winner','no_sale') OR (c.ends_at IS NOT NULL AND c.ends_at < ?))",
    ];
    params.push(Date.now());

    const searchClause = buildSearchWhere(
      ["c.title", "c.brand", "c.model", "c.winner_name", "c.winner_email"],
      q.search,
      params,
    );
    if (searchClause) where.push(searchClause);

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const limitSql = paginatedLimitSql(q.page!, q.pageSize!);

    const { rows: countRows } = await db.query<{ total: number }>(
      `SELECT COUNT(DISTINCT c.id) AS total FROM cars c ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const { rows } = await db.query<DbCar & { bids_count: number }>(
      `SELECT c.*, COUNT(b.id) AS bids_count
       FROM cars c
       LEFT JOIN bids b ON b.car_id = c.id
       ${whereSql}
       GROUP BY c.id
       ORDER BY COALESCE(c.ended_at, FROM_UNIXTIME(c.ends_at / 1000)) DESC
       ${limitSql}`,
      params,
    );

    return {
      rows: rows.map((r) => ({
        ...r,
        bids_count: Number(r.bids_count),
        reserve_met: r.reserve_price == null || Number(r.current_bid ?? 0) >= Number(r.reserve_price),
      })),
      total,
      page: q.page!,
      pageSize: q.pageSize!,
    };
  });

export type AdminDashboardCounts = {
  totalCars: number;
  liveCars: number;
  soldCars: number;
  totalUsers: number;
  pendingEntries: number;
  totalBids: number;
  brands: { brand: string; count: number }[];
};

export const getAdminDashboardCounts = createServerFn().handler(async (): Promise<AdminDashboardCounts> => {
  await requireAdminEmail();
  const db = getDb();

  const { rows: carRows } = await db.query<{
    total_cars: number;
    live_cars: number;
    sold_cars: number;
  }>(
    `SELECT
       COUNT(*) AS total_cars,
       SUM(CASE WHEN is_live = 1 AND is_sold = 0 THEN 1 ELSE 0 END) AS live_cars,
       SUM(CASE WHEN is_sold = 1 THEN 1 ELSE 0 END) AS sold_cars
     FROM cars`,
  );

  const { rows: userRows } = await db.query<{ c: number }>(`SELECT COUNT(*) AS c FROM users`);
  const { rows: entryRows } = await db.query<{ c: number }>(
    `SELECT COUNT(*) AS c FROM auction_entry_requests WHERE status = 'pending'`,
  );
  const { rows: bidRows } = await db.query<{ c: number }>(`SELECT COUNT(*) AS c FROM bids`);

  const { rows: brandRows } = await db.query<{ brand: string; count: number }>(
    `SELECT brand, COUNT(*) AS count FROM cars GROUP BY brand ORDER BY count DESC LIMIT 10`,
  );

  const cr = carRows[0];
  return {
    totalCars: Number(cr?.total_cars ?? 0),
    liveCars: Number(cr?.live_cars ?? 0),
    soldCars: Number(cr?.sold_cars ?? 0),
    totalUsers: Number(userRows[0]?.c ?? 0),
    pendingEntries: Number(entryRows[0]?.c ?? 0),
    totalBids: Number(bidRows[0]?.c ?? 0),
    brands: brandRows.map((b) => ({ brand: b.brand, count: Number(b.count) })),
  };
});

export const queryAdminCarBrands = createServerFn().handler(async (): Promise<string[]> => {
  await requireAdminEmail();
  const db = getDb();
  const { rows } = await db.query<{ brand: string }>(
    `SELECT DISTINCT brand FROM cars WHERE brand IS NOT NULL AND brand != '' ORDER BY brand ASC`,
  );
  return rows.map((r) => r.brand);
});

export type AdminCarOption = {
  id: string;
  title: string;
  brand: string;
  year: number;
  is_live: number | boolean;
  is_sold: number | boolean;
  current_bid: number | null;
  price: number;
};

/** Lightweight car list for hero pin picker and bid filters (no images/json blobs). */
export const queryAdminCarOptions = createServerFn().handler(async (): Promise<AdminCarOption[]> => {
  await requireAdminEmail();
  const db = getDb();
  const { rows } = await db.query<AdminCarOption>(
    `SELECT id, title, brand, year, is_live, is_sold, current_bid, price
     FROM cars
     ORDER BY is_live DESC, title ASC
     LIMIT 2000`,
  );
  return rows;
});

/** Export full inventory as CSV without loading heavy fields client-side. */
export const exportAdminInventoryCsv = createServerFn().handler(async (): Promise<string> => {
  await requireAdminEmail();
  const db = getDb();
  const { rows } = await db.query<{
    title: string;
    brand: string;
    model: string;
    year: number;
    vin: string | null;
    is_sold: number;
    is_live: number;
    price: number;
    current_bid: number | null;
    city: string;
    condition: string;
    mileage: number;
    featured: number;
  }>(
    `SELECT title, brand, model, year, vin, is_sold, is_live, price, current_bid, city, condition, mileage, featured
     FROM cars ORDER BY created_at DESC`,
  );

  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = ["Title", "Brand", "Model", "Year", "VIN", "Status", "Price", "Current Bid", "City", "Condition", "Mileage", "Featured"];
  const lines = [
    header.join(","),
    ...rows.map((c) => [
      c.title, c.brand, c.model, c.year, c.vin ?? "",
      c.is_sold ? "sold" : c.is_live ? "live" : "listed",
      c.price, c.current_bid ?? "",
      c.city, c.condition, c.mileage, c.featured ? "yes" : "no",
    ].map(escape).join(",")),
  ];
  return lines.join("\n");
});

export const exportBidsCsv = createServerFn().handler(async (): Promise<string> => {
  await requireAdminEmail();
  const db = getDb();
  const { rows } = await db.query<{
    id: number; car_id: string; car_title: string; user_name: string; user_email: string | null; amount: number; created_at: string;
  }>(
    `SELECT b.id, b.car_id, c.title AS car_title, b.user_name, b.user_email, b.amount, b.created_at
     FROM bids b JOIN cars c ON c.id = b.car_id ORDER BY b.created_at DESC LIMIT 5000`,
  );
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return ["id,car_id,car_title,user_name,user_email,amount,created_at", ...rows.map((r) =>
    [r.id, r.car_id, r.car_title, r.user_name, r.user_email ?? "", r.amount, r.created_at].map(escape).join(","),
  )].join("\n");
});

export const exportDepositsCsv = createServerFn().handler(async (): Promise<string> => {
  await requireAdminEmail();
  const db = getDb();
  const { rows } = await db.query<{
    user_email: string; car_id: string; amount: number; status: string; refund_status: string; refund_amount: number | null; instapay_number: string | null;
  }>(`SELECT user_email, car_id, amount, status, refund_status, refund_amount, instapay_number FROM deposits ORDER BY created_at DESC`);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return ["user_email,car_id,amount,status,refund_status,refund_amount,instapay_number", ...rows.map((r) =>
    [r.user_email, r.car_id, r.amount, r.status, r.refund_status, r.refund_amount ?? "", r.instapay_number ?? ""].map(escape).join(","),
  )].join("\n");
});

export const exportFinancialReportCsv = createServerFn().handler(async (): Promise<string> => {
  await requireAdminEmail();
  const summary = await getFinancialSummary();
  return [
    "metric,value",
    `sold_revenue,${summary.soldRevenue}`,
    `total_expenses,${summary.totalExpenses}`,
    `net_revenue,${summary.netRevenue}`,
    `deposits_held,${summary.depositsHeld}`,
    `deposits_refunded,${summary.depositsRefunded}`,
    `pending_refunds,${summary.pendingRefundsAmount}`,
    `inventory_value,${summary.inventoryValue}`,
  ].join("\n");
});
