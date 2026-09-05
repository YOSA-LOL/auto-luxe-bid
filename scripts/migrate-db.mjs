import mysql from "mysql2/promise";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const url = process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3306/car_showroom";
const parsed = new URL(url);
const pool = mysql.createPool({
  host: parsed.hostname,
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username || "root"),
  password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
  database: parsed.pathname.replace(/^\//, "").split("?")[0] || "car_showroom",
});

async function columnExists(conn, table, column) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return cols.length > 0;
}

async function addColumn(conn, table, column, definition) {
  if (await columnExists(conn, table, column)) {
    console.log(`✓ ${table}.${column} already exists`);
    return;
  }
  await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`✓ Added ${table}.${column}`);
}

const conn = await pool.getConnection();
try {
  await addColumn(conn, "users", "clerk_id", "VARCHAR(255) UNIQUE AFTER id");
  await addColumn(conn, "cars", "is_visible", "TINYINT(1) NOT NULL DEFAULT 1 AFTER sold_at");
  await addColumn(conn, "cars", "auction_status", "ENUM('none','live','ended','ended_with_winner','no_sale','sold') NOT NULL DEFAULT 'none' AFTER is_visible");
  await addColumn(conn, "cars", "winner_email", "VARCHAR(255) NULL AFTER auction_status");
  await addColumn(conn, "cars", "winner_name", "VARCHAR(255) NULL AFTER winner_email");
  await addColumn(conn, "cars", "winning_bid_id", "INT NULL AFTER winner_name");
  await addColumn(conn, "cars", "ended_at", "DATETIME(3) NULL AFTER winning_bid_id");
  await addColumn(conn, "bids", "user_email", "VARCHAR(255) NULL AFTER user_name");
  await addColumn(conn, "deposits", "instapay_number", "VARCHAR(255) NULL AFTER amount");
  await addColumn(conn, "deposits", "refund_status", "ENUM('none','pending','refunded') NOT NULL DEFAULT 'none' AFTER instapay_number");
  await addColumn(conn, "deposits", "refund_amount", "DECIMAL(15,2) NULL AFTER refund_status");
  await addColumn(conn, "deposits", "refunded_at", "DATETIME(3) NULL AFTER refund_amount");
  await addColumn(conn, "deposits", "approved_at", "DATETIME(3) NULL AFTER refunded_at");

  await conn.query(`CREATE TABLE IF NOT EXISTS activity_log (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    details TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log("✓ activity_log");

  await conn.query(`CREATE TABLE IF NOT EXISTS broadcast_notifications (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sent_by VARCHAR(255) NOT NULL,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log("✓ broadcast_notifications");

  await conn.query(`CREATE TABLE IF NOT EXISTS expenses (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL,
    expense_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log("✓ expenses");

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
  console.log("✓ user_notifications");

  try {
    await conn.query(`CREATE INDEX bids_car_amount_idx ON bids (car_id, amount DESC)`);
    console.log("✓ bids_car_amount_idx");
  } catch {
    console.log("✓ bids_car_amount_idx already exists");
  }

  console.log("\nMigration complete.");
} finally {
  conn.release();
  await pool.end();
}
