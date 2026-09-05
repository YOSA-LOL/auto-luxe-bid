import { createServerFn } from "@tanstack/react-start";
import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { getDb } from "./db.server";
import { CLERK_SECRET_KEY } from "./clerk-config.server";
import { getAdminEmails, resolveIsAdmin, getMergedAdminEmailsAsync } from "./admin-access.server";
import type { DbBid } from "./cars.server";
import type { DbCar } from "./types";

async function ensureAdminTables() {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      admin_email VARCHAR(255) NOT NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id VARCHAR(255),
      details TEXT,
      created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS broadcast_notifications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      sent_by VARCHAR(255) NOT NULL,
      created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getMergedAdminEmails(): Promise<string[]> {
  return getMergedAdminEmailsAsync();
}

export async function requireAdminEmail(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const client = clerkClient({ secretKey: CLERK_SECRET_KEY });
  const clerkUser = await client.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const admins = await getMergedAdminEmails();
  if (!resolveIsAdmin(email, admins)) throw new Error("Forbidden");
  return email;
}

export async function logAdminActivity(
  adminEmail: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: string,
) {
  await ensureAdminTables();
  const db = getDb();
  await db.query(
    `INSERT INTO activity_log (admin_email, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)`,
    [adminEmail, action, entityType ?? null, entityId ?? null, details ?? null],
  );
}

export type ActivityLogEntry = {
  id: number;
  admin_email: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
};

export type BroadcastNotification = {
  id: number;
  title: string;
  body: string;
  sent_by: string;
  created_at: string;
};

export type AdminBidRow = DbBid & {
  car_title: string;
  car_brand: string;
  is_live: boolean;
};

export type WeeklyRevenuePoint = {
  label: string;
  revenue: number;
  bids: number;
};

export type FinancialSummary = {
  inventoryValue: number;
  liveAuctionValue: number;
  soldRevenue: number;
  soldCount: number;
  listedCount: number;
  liveCount: number;
  totalCars: number;
  totalBidsVolume: number;
  totalBidsCount: number;
  avgSoldPrice: number;
  totalExpenses: number;
  depositsHeld: number;
  depositsRefunded: number;
  netRevenue: number;
  pendingRefundsCount: number;
  pendingRefundsAmount: number;
  pendingWinnersCount: number;
};

export type Expense = {
  id: number;
  title: string;
  category: string | null;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
};

export const getFinancialSummary = createServerFn().handler(async (): Promise<FinancialSummary> => {
  await requireAdminEmail();
  const db = getDb();
  const { rows: carRows } = await db.query<{
    inventory_value: number;
    live_value: number;
    sold_revenue: number;
    sold_count: number;
    listed_count: number;
    live_count: number;
    total_cars: number;
    pending_winners: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN is_sold = 0 THEN price ELSE 0 END), 0) AS inventory_value,
       COALESCE(SUM(CASE WHEN is_live = 1 AND is_sold = 0 THEN COALESCE(current_bid, starting_price, price) ELSE 0 END), 0) AS live_value,
       COALESCE(SUM(CASE WHEN is_sold = 1 THEN COALESCE(current_bid, price) ELSE 0 END), 0) AS sold_revenue,
       COALESCE(SUM(CASE WHEN is_sold = 1 THEN 1 ELSE 0 END), 0) AS sold_count,
       COALESCE(SUM(CASE WHEN is_sold = 0 AND is_live = 0 THEN 1 ELSE 0 END), 0) AS listed_count,
       COALESCE(SUM(CASE WHEN is_live = 1 AND is_sold = 0 THEN 1 ELSE 0 END), 0) AS live_count,
       COUNT(*) AS total_cars,
       COALESCE(SUM(CASE WHEN auction_status = 'ended_with_winner' AND is_sold = 0 THEN 1 ELSE 0 END), 0) AS pending_winners
     FROM cars`,
  );
  const { rows: bidRows } = await db.query<{ total_volume: number; total_count: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total_volume, COUNT(*) AS total_count FROM bids`,
  );
  const { rows: expRows } = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses`,
  );
  const { rows: depRows } = await db.query<{
    held: number;
    refunded: number;
    pending_count: number;
    pending_amount: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'paid' AND refund_status = 'none' THEN amount ELSE 0 END), 0) AS held,
       COALESCE(SUM(CASE WHEN refund_status = 'refunded' THEN COALESCE(refund_amount, amount * 0.8) ELSE 0 END), 0) AS refunded,
       COALESCE(SUM(CASE WHEN refund_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count,
       COALESCE(SUM(CASE WHEN refund_status = 'pending' THEN COALESCE(refund_amount, amount * 0.8) ELSE 0 END), 0) AS pending_amount
     FROM deposits`,
  );
  const carRow = carRows[0];
  const bidRow = bidRows[0];
  const soldCount = Number(carRow?.sold_count ?? 0);
  const soldRevenue = Number(carRow?.sold_revenue ?? 0);
  const totalExpenses = Number(expRows[0]?.total ?? 0);
  return {
    inventoryValue: Number(carRow?.inventory_value ?? 0),
    liveAuctionValue: Number(carRow?.live_value ?? 0),
    soldRevenue,
    soldCount,
    listedCount: Number(carRow?.listed_count ?? 0),
    liveCount: Number(carRow?.live_count ?? 0),
    totalCars: Number(carRow?.total_cars ?? 0),
    totalBidsVolume: Number(bidRow?.total_volume ?? 0),
    totalBidsCount: Number(bidRow?.total_count ?? 0),
    avgSoldPrice: soldCount > 0 ? Math.round(soldRevenue / soldCount) : 0,
    totalExpenses,
    depositsHeld: Number(depRows[0]?.held ?? 0),
    depositsRefunded: Number(depRows[0]?.refunded ?? 0),
    netRevenue: soldRevenue - totalExpenses,
    pendingRefundsCount: Number(depRows[0]?.pending_count ?? 0),
    pendingRefundsAmount: Number(depRows[0]?.pending_amount ?? 0),
    pendingWinnersCount: Number(carRow?.pending_winners ?? 0),
  };
});

export const getExpenses = createServerFn().handler(async (): Promise<Expense[]> => {
  await requireAdminEmail();
  const db = getDb();
  const { rows } = await db.query<Expense>(`SELECT * FROM expenses ORDER BY expense_date DESC, id DESC LIMIT 200`);
  return rows;
});

export const createExpense = createServerFn()
  .inputValidator((input: { title: string; category?: string; amount: number; expenseDate: string; notes?: string }) => input)
  .handler(async ({ data }): Promise<Expense> => {
    const adminEmail = await requireAdminEmail();
    const db = getDb();
    await db.query(
      `INSERT INTO expenses (title, category, amount, expense_date, notes) VALUES ($1, $2, $3, $4, $5)`,
      [data.title.trim(), data.category?.trim() || null, data.amount, data.expenseDate, data.notes?.trim() || null],
    );
    const { rows } = await db.query<Expense>(`SELECT * FROM expenses ORDER BY id DESC LIMIT 1`);
    await logAdminActivity(adminEmail, "create_expense", "expense", String(rows[0]?.id), data.title);
    return rows[0];
  });

export const deleteExpense = createServerFn()
  .inputValidator((id: number) => id)
  .handler(async ({ data: id }): Promise<void> => {
    const adminEmail = await requireAdminEmail();
    const db = getDb();
    await db.query(`DELETE FROM expenses WHERE id = $1`, [id]);
    await logAdminActivity(adminEmail, "delete_expense", "expense", String(id));
  });

export const getAllBidsAdmin = createServerFn()
  .inputValidator((carId?: string) => carId ?? "")
  .handler(async ({ data: carId }): Promise<AdminBidRow[]> => {
    await requireAdminEmail();
    const db = getDb();
    const params: string[] = [];
    let where = "";
    if (carId) {
      where = "WHERE b.car_id = $1";
      params.push(carId);
    }
    const { rows } = await db.query<AdminBidRow>(
      `SELECT b.*, c.title AS car_title, c.brand AS car_brand, c.is_live
       FROM bids b
       JOIN cars c ON c.id = b.car_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT 500`,
      params,
    );
    return rows;
  });

export const getExpiredAuctions = createServerFn().handler(async (): Promise<DbCar[]> => {
  await requireAdminEmail();
  const db = getDb();
  const now = Date.now();
  const { rows } = await db.query<DbCar & { bids_count: number }>(
    `SELECT c.*, COUNT(b.id) AS bids_count
     FROM cars c
     LEFT JOIN bids b ON b.car_id = c.id
     WHERE c.ends_at IS NOT NULL AND c.ends_at < $1
     GROUP BY c.id
     ORDER BY c.ends_at DESC
     LIMIT 100`,
    [now],
  );
  return rows.map((r) => ({ ...r, bids_count: Number(r.bids_count) }));
});

export const getWeeklyRevenueStats = createServerFn().handler(async (): Promise<WeeklyRevenuePoint[]> => {
  await requireAdminEmail();
  const db = getDb();
  const { rows: soldRows } = await db.query<{ week_key: string; revenue: number }>(
    `SELECT DATE_FORMAT(sold_at, '%Y-%u') AS week_key,
            SUM(COALESCE(current_bid, price)) AS revenue
     FROM cars
     WHERE is_sold = 1 AND sold_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
     GROUP BY week_key
     ORDER BY week_key ASC`,
  );
  const { rows: bidRows } = await db.query<{ week_key: string; bids: number }>(
    `SELECT DATE_FORMAT(created_at, '%Y-%u') AS week_key,
            COUNT(*) AS bids
     FROM bids
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
     GROUP BY week_key
     ORDER BY week_key ASC`,
  );
  const bidMap = new Map(bidRows.map((r) => [r.week_key, Number(r.bids)]));
  const points: WeeklyRevenuePoint[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const weekKey = `${d.getFullYear()}-${String(getWeek(d)).padStart(2, "0")}`;
    const sold = soldRows.find((r) => r.week_key === weekKey);
    points.push({
      label: d.toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      revenue: Number(sold?.revenue ?? 0),
      bids: bidMap.get(weekKey) ?? 0,
    });
  }
  if (points.every((p) => p.revenue === 0 && p.bids === 0) && soldRows.length > 0) {
    return soldRows.slice(-12).map((r, i) => ({
      label: `W${i + 1}`,
      revenue: Number(r.revenue),
      bids: bidMap.get(r.week_key) ?? 0,
    }));
  }
  return points;
});

function getWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export const getAdminEmailsFromDb = createServerFn().handler(async (): Promise<string[]> => {
  await requireAdminEmail();
  return getMergedAdminEmails();
});

export const addAdminEmail = createServerFn()
  .inputValidator((email: string) => email.trim().toLowerCase())
  .handler(async ({ data: email }): Promise<string[]> => {
    const adminEmail = await requireAdminEmail();
    if (!email.includes("@")) throw new Error("Invalid email");
    const db = getDb();
    const current = await getMergedAdminEmails();
    if (current.includes(email)) return current;
    const envAdmins = getAdminEmails();
    const dbOnly = current.filter((e) => !envAdmins.includes(e));
    const updated = [...dbOnly, email];
    await db.query(
      `INSERT INTO site_settings (\`key\`, value) VALUES ('admin_emails', $1)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [JSON.stringify(updated)],
    );
    await logAdminActivity(adminEmail, "add_admin", "admin", email);
    return [...current, email];
  });

export const removeAdminEmail = createServerFn()
  .inputValidator((email: string) => email.trim().toLowerCase())
  .handler(async ({ data: email }): Promise<string[]> => {
    const adminEmail = await requireAdminEmail();
    const envAdmins = getAdminEmails();
    if (envAdmins.includes(email)) throw new Error("Cannot remove .env admin");
    const db = getDb();
    const current = await getMergedAdminEmails();
    const dbOnly = current.filter((e) => !envAdmins.includes(e) && e !== email);
    await db.query(
      `INSERT INTO site_settings (\`key\`, value) VALUES ('admin_emails', $1)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [JSON.stringify(dbOnly)],
    );
    await logAdminActivity(adminEmail, "remove_admin", "admin", email);
    return current.filter((e) => e !== email);
  });

export const sendBroadcastNotification = createServerFn()
  .inputValidator((input: { title: string; body: string }) => input)
  .handler(async ({ data }): Promise<BroadcastNotification> => {
    const adminEmail = await requireAdminEmail();
    if (!data.title.trim() || !data.body.trim()) throw new Error("Title and body required");
    await ensureAdminTables();
    const db = getDb();
    await db.query(
      `INSERT INTO broadcast_notifications (title, body, sent_by) VALUES ($1, $2, $3)`,
      [data.title.trim(), data.body.trim(), adminEmail],
    );
    const { rows } = await db.query<BroadcastNotification>(
      `SELECT * FROM broadcast_notifications ORDER BY id DESC LIMIT 1`,
    );
    await logAdminActivity(adminEmail, "broadcast", "notification", String(rows[0]?.id), data.title);
    return rows[0];
  });

export const getBroadcastNotifications = createServerFn().handler(async (): Promise<BroadcastNotification[]> => {
  await ensureAdminTables();
  const db = getDb();
  const { rows } = await db.query<BroadcastNotification>(
    `SELECT * FROM broadcast_notifications ORDER BY created_at DESC LIMIT 50`,
  );
  return rows;
});

export const recordAdminActivity = createServerFn()
  .inputValidator((input: { action: string; entityType?: string; entityId?: string; details?: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    const adminEmail = await requireAdminEmail();
    await logAdminActivity(adminEmail, data.action, data.entityType, data.entityId, data.details);
  });

/** Loader-safe: merged admin emails for client-side gate */
export const getMergedAdminEmailsForLoader = createServerFn().handler(async (): Promise<string[]> => {
  return getMergedAdminEmails();
});
