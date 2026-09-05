/**
 * db.server.ts
 * MySQL (mysql2) wrapper — provides a pg-compatible interface.
 *
 * Features:
 *  - $1/$2/... placeholder → ? conversion (so most SQL stays unchanged)
 *  - JSON array columns auto-parsed on read, auto-serialised on write
 *  - TINYINT(1) → boolean via typeCast
 *  - Transaction helpers: beginTransaction / commit / rollback
 *  - insertAndReturnId() for INSERT + LAST_INSERT_ID() pattern
 */

import type { ExecuteValues } from "mysql2";
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";

// Columns stored as JSON in MySQL (were TEXT[] in Postgres)
const JSON_ARRAY_COLS = new Set(["images", "videos", "documents", "car_options"]);

type Row = Record<string, unknown>;

function parseRow(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (JSON_ARRAY_COLS.has(k)) {
      if (v === null || v === undefined) {
        out[k] = [];
      } else if (typeof v === "string") {
        try { out[k] = JSON.parse(v); } catch { out[k] = []; }
      } else {
        out[k] = v; // already a JS array (mysql2 parsed it)
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Serialize any plain arrays in the params list to JSON strings for MySQL */
function serializeParams(params: unknown[]): unknown[] {
  return params.map((p) => {
    if (Array.isArray(p)) return JSON.stringify(p);
    return p;
  });
}

/** Convert PostgreSQL $1 $2 … placeholders to MySQL ? */
function convertSql(sql: string): string {
  return sql.replace(/\$\d+/g, "?");
}

// ── Pool singleton (globalThis survives Vite HMR reloads) ─────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __apex_mysql_pool__: Pool | undefined;
  // eslint-disable-next-line no-var
  var __apex_schema_ready__: Promise<void> | undefined;
}

async function columnExists(conn: PoolConnection, table: string, column: string): Promise<boolean> {
  const [cols] = await conn.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return cols.length > 0;
}

async function addColumnIfMissing(conn: PoolConnection, table: string, column: string, definition: string): Promise<void> {
  if (await columnExists(conn, table, column)) return;
  await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`[db] Added ${table}.${column}`);
}

async function ensureCarsSchema(pool: Pool): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await addColumnIfMissing(conn, "cars", "is_visible", "TINYINT(1) NOT NULL DEFAULT 1 AFTER sold_at");
    await addColumnIfMissing(conn, "cars", "auction_status", "ENUM('none','live','ended','ended_with_winner','no_sale','sold') NOT NULL DEFAULT 'none' AFTER is_visible");
    await addColumnIfMissing(conn, "cars", "winner_email", "VARCHAR(255) NULL AFTER auction_status");
    await addColumnIfMissing(conn, "cars", "winner_name", "VARCHAR(255) NULL AFTER winner_email");
    await addColumnIfMissing(conn, "cars", "winning_bid_id", "INT NULL AFTER winner_name");
    await addColumnIfMissing(conn, "cars", "ended_at", "DATETIME(3) NULL AFTER winning_bid_id");
    await addColumnIfMissing(conn, "bids", "user_email", "VARCHAR(255) NULL AFTER user_name");
    await addColumnIfMissing(conn, "deposits", "instapay_number", "VARCHAR(255) NULL AFTER amount");
    await addColumnIfMissing(conn, "deposits", "refund_status", "ENUM('none','pending','refunded') NOT NULL DEFAULT 'none' AFTER instapay_number");
    await addColumnIfMissing(conn, "deposits", "refund_amount", "DECIMAL(15,2) NULL AFTER refund_status");
    await addColumnIfMissing(conn, "deposits", "refunded_at", "DATETIME(3) NULL AFTER refund_amount");
    await addColumnIfMissing(conn, "deposits", "approved_at", "DATETIME(3) NULL AFTER refunded_at");

    await conn.query(`CREATE TABLE IF NOT EXISTS expenses (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      amount DECIMAL(15,2) NOT NULL,
      expense_date DATE NOT NULL,
      notes TEXT,
      created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await conn.query(`CREATE TABLE IF NOT EXISTS user_notifications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      car_id VARCHAR(255),
      read_at DATETIME(3) NULL,
      created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
      INDEX user_notifications_email_idx (user_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    try {
      await conn.query(`CREATE INDEX bids_car_amount_idx ON bids (car_id, amount DESC)`);
    } catch {
      /* index may already exist */
    }
  } finally {
    conn.release();
  }
}

export async function getMysqlPool(): Promise<Pool> {
  if (globalThis.__apex_mysql_pool__) return globalThis.__apex_mysql_pool__;

  const mysql = await import("mysql2/promise");
  const url = process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3306/car_showroom";

  let host = "127.0.0.1", port = 3306, user = "root",
    password: string | undefined = undefined, database = "car_showroom";
  let useSsl = false;
  try {
    const parsed = new URL(url);
    host     = parsed.hostname || "127.0.0.1";
    port     = parseInt(parsed.port || "3306", 10);
    user     = decodeURIComponent(parsed.username || "root");
    password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
    database = parsed.pathname.replace(/^\//, "").split("?")[0] || "car_showroom";
    const sslMode = (parsed.searchParams.get("ssl-mode") || parsed.searchParams.get("ssl") || "").toLowerCase();
    useSsl = sslMode === "required" || sslMode === "true" || sslMode === "1";
  } catch { /* keep defaults */ }

  const pool = mysql.createPool({
    host, port, user, password, database,
    waitForConnections: true,
    connectionLimit: 5,
    maxIdle: 5,
    idleTimeout: 30_000,
    enableKeepAlive: true,
    charset: "utf8mb4",
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    typeCast(field, next) {
      // TINYINT(1) → boolean
      if (field.type === "TINY" && field.length === 1) {
        const val = field.string();
        return val === null ? null : val === "1";
      }
      return next();
    },
  });

  globalThis.__apex_mysql_pool__ = pool;
  if (!globalThis.__apex_schema_ready__) {
    globalThis.__apex_schema_ready__ = ensureCarsSchema(pool);
  }
  await globalThis.__apex_schema_ready__;
  return pool;
}

// ── Shared result type ────────────────────────────────────────────────────────

export interface QueryResult<T = Row> {
  rows: T[];
  rowCount: number;
}

// ── Pool-level helper ─────────────────────────────────────────────────────────

async function runQuery<T = Row>(
  executor: (sql: string, params: unknown[]) => Promise<[unknown, unknown]>,
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const converted = convertSql(sql);
  const serialized = serializeParams(params);
  const [result] = await executor(converted, serialized);
  if (Array.isArray(result)) {
    const rows = (result as RowDataPacket[]).map(parseRow) as T[];
    return { rows, rowCount: rows.length };
  }
  return { rows: [], rowCount: (result as ResultSetHeader).affectedRows ?? 0 };
}

// ── Transaction client (wraps a PoolConnection) ───────────────────────────────

export class DbClient {
  constructor(private conn: PoolConnection) {}

  async beginTransaction(): Promise<void> { await this.conn.beginTransaction(); }
  async commit(): Promise<void>           { await this.conn.commit(); }
  async rollback(): Promise<void>         { await this.conn.rollback(); }

  async query<T = Row>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return runQuery<T>((s, p) => this.conn.execute(s, p as ExecuteValues), sql, params);
  }

  /** Returns the auto-generated ID from the last INSERT */
  async lastInsertId(): Promise<number> {
    const [[row]] = await this.conn.query("SELECT LAST_INSERT_ID() AS id") as [RowDataPacket[], unknown];
    return row.id as number;
  }

  release(): void { this.conn.release(); }
}

// ── Pool wrapper ──────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __apex_db_pool__: DbPool | undefined;
}

export class DbPool {
  async query<T = Row>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const pool = await getMysqlPool();
    return runQuery<T>((s, p) => pool.execute(s, p as ExecuteValues), sql, params);
  }

  async connect(): Promise<DbClient> {
    const pool = await getMysqlPool();
    const conn = await pool.getConnection();
    return new DbClient(conn);
  }

  /** no-op: pool stays alive between requests */
  async end(): Promise<void> {}
}

/** Get a shared DbPool instance */
export function getDb(): DbPool {
  if (!globalThis.__apex_db_pool__) {
    globalThis.__apex_db_pool__ = new DbPool();
  }
  return globalThis.__apex_db_pool__;
}

// Release MySQL connections on Vite HMR reload (prevents "Too many connections")
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void globalThis.__apex_mysql_pool__?.end().catch(() => {});
    globalThis.__apex_mysql_pool__ = undefined;
    globalThis.__apex_db_pool__ = undefined;
    globalThis.__apex_schema_ready__ = undefined;
  });
}
