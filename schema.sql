-- =============================================================
-- APEXAuto — Full Database Schema
-- =============================================================
-- Run this once against a new PostgreSQL database to create
-- all tables.  Safe to re-run (uses IF NOT EXISTS throughout).
--
-- Usage:
--   psql "$DATABASE_URL" -f schema.sql
-- Or interactively:
--   psql -U <user> -d apexauto -f schema.sql
-- =============================================================

-- ------------------------------------------------------------
-- 1. users  (Clerk accounts synced on login; password optional/legacy)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  clerk_id   TEXT UNIQUE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. cars  (main inventory)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cars (
  id                     TEXT PRIMARY KEY,
  title                  TEXT NOT NULL,
  brand                  TEXT NOT NULL,
  model                  TEXT NOT NULL,
  year                   INTEGER NOT NULL,
  trim                   TEXT,
  price                  NUMERIC NOT NULL,
  currency               TEXT NOT NULL DEFAULT 'EGP',
  mileage                INTEGER NOT NULL DEFAULT 0,
  fuel                   TEXT NOT NULL DEFAULT 'Petrol',
  transmission           TEXT NOT NULL DEFAULT 'Automatic',
  drivetrain             TEXT,
  color                  TEXT NOT NULL DEFAULT 'White',
  condition              TEXT NOT NULL DEFAULT 'Used',
  is_new                 BOOLEAN DEFAULT FALSE,
  image_url              TEXT,
  images                 TEXT[] DEFAULT '{}',
  videos                 TEXT[] DEFAULT '{}',
  documents              TEXT[] DEFAULT '{}',
  dealership             TEXT NOT NULL DEFAULT '',
  city                   TEXT NOT NULL DEFAULT '',
  verified               BOOLEAN DEFAULT FALSE,
  hp                     INTEGER,
  engine                 TEXT,
  vin                    TEXT,
  plate_status           TEXT,
  seats                  INTEGER DEFAULT 5,
  is_live                BOOLEAN DEFAULT FALSE,
  is_sold                BOOLEAN DEFAULT FALSE,
  sold_at                TIMESTAMPTZ,
  is_visible             BOOLEAN DEFAULT TRUE,
  current_bid            NUMERIC,
  starting_price         NUMERIC,
  buy_now_price          NUMERIC,
  reserve_price          NUMERIC,
  min_raise              NUMERIC DEFAULT 10000,
  ends_at                BIGINT,
  viewers                INTEGER DEFAULT 0,
  featured               BOOLEAN DEFAULT FALSE,
  accident_history       BOOLEAN DEFAULT FALSE,
  paint_condition        TEXT,
  tire_condition         TEXT,
  battery_health         INTEGER,
  service_history        TEXT,
  description            TEXT,
  engine_condition       TEXT,
  transmission_condition TEXT,
  suspension_condition   TEXT,
  battery_condition      TEXT,
  chassis_condition      TEXT,
  interior_condition     TEXT,
  previous_owners        INTEGER,
  license_expiry         TEXT,
  car_options            TEXT[] DEFAULT '{}',
  condition_notes        TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. bids
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bids (
  id         SERIAL PRIMARY KEY,
  car_id     TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  user_name  TEXT NOT NULL,
  amount     NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. proxy_bids  (max-bid automation)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proxy_bids (
  id         SERIAL PRIMARY KEY,
  car_id     TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  user_name  TEXT NOT NULL,
  max_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (car_id, user_name)
);

-- ------------------------------------------------------------
-- 5. favorites
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  car_id     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, car_id)
);

-- ------------------------------------------------------------
-- 6. listing_requests  ("sell your car" submissions)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_requests (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  brand      TEXT NOT NULL,
  model      TEXT NOT NULL,
  year       TEXT,
  price      TEXT,
  notes      TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 7. auction_entry_requests  (deposit proof submissions)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_entry_requests (
  id               SERIAL PRIMARY KEY,
  user_name        TEXT NOT NULL,
  user_email       TEXT NOT NULL,
  car_id           TEXT NOT NULL,
  car_title        TEXT NOT NULL,
  proof_image_url  TEXT NOT NULL,
  instapay_number  TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'pending',
  deposit_amount   INTEGER NOT NULL DEFAULT 500,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_email, car_id)
);

-- ------------------------------------------------------------
-- 8. site_settings  (key/value admin config)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Seed default settings (safe to re-run)
INSERT INTO site_settings (key, value) VALUES
  ('deposit_amount',    '500'),
  ('transfer_number',   ''),
  ('payment_info',      ''),
  ('featured_hero_car_id', '')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 9. deposits  (tracks who paid per car)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deposits (
  id                       SERIAL PRIMARY KEY,
  user_email               TEXT NOT NULL,
  car_id                   TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  amount                   INTEGER NOT NULL DEFAULT 500,
  status                   TEXT NOT NULL DEFAULT 'pending',
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_email, car_id)
);

-- ------------------------------------------------------------
-- 10. chat_messages  (buyer ↔ admin per car)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id          SERIAL PRIMARY KEY,
  car_id      TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_name  TEXT NOT NULL DEFAULT '',
  sender_role TEXT NOT NULL CHECK (sender_role IN ('buyer', 'admin')),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_car_buyer_idx
  ON chat_messages (car_id, buyer_email);

-- =============================================================
-- Done.  All 10 tables created.
-- =============================================================
