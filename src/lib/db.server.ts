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

// ── Pool singleton ────────────────────────────────────────────────────────────

let _pool: Pool | null = null;

export async function getMysqlPool(): Promise<Pool> {
  if (_pool) return _pool;
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

  _pool = mysql.createPool({
    host, port, user, password, database,
    waitForConnections: true,
    connectionLimit: 10,
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
  return _pool;
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
    return runQuery<T>((s, p) => this.conn.execute(s, p), sql, params);
  }

  /** Returns the auto-generated ID from the last INSERT */
  async lastInsertId(): Promise<number> {
    const [[row]] = await this.conn.query("SELECT LAST_INSERT_ID() AS id") as [RowDataPacket[], unknown];
    return row.id as number;
  }

  release(): void { this.conn.release(); }
}

// ── Pool wrapper ──────────────────────────────────────────────────────────────

export class DbPool {
  async query<T = Row>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const pool = await getMysqlPool();
    return runQuery<T>((s, p) => pool.execute(s, p), sql, params);
  }

  async connect(): Promise<DbClient> {
    const pool = await getMysqlPool();
    const conn = await pool.getConnection();
    return new DbClient(conn);
  }

  /** no-op: pool stays alive between requests */
  async end(): Promise<void> {}
}

/** Get a DbPool instance */
export function getDb(): DbPool {
  return new DbPool();
}
