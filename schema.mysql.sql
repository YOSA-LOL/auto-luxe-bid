-- =============================================================
-- APEXAuto — MySQL Database Schema (MySQL 8.0+)
-- =============================================================
-- Usage (first time):
--   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS car_showroom CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
--   mysql -u root -p car_showroom < schema.mysql.sql
--
-- Or all in one:
--   mysql -u root -p car_showroom < schema.mysql.sql
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. users  (Clerk accounts synced on login; password optional/legacy)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  clerk_id   VARCHAR(255) UNIQUE,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   TEXT NULL,
  phone      VARCHAR(50),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. cars  (main inventory)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cars (
  id                     VARCHAR(255) PRIMARY KEY,
  title                  TEXT NOT NULL,
  brand                  VARCHAR(100) NOT NULL,
  model                  VARCHAR(100) NOT NULL,
  year                   INT NOT NULL,
  trim                   VARCHAR(100),
  price                  DECIMAL(15,2) NOT NULL,
  currency               VARCHAR(10) NOT NULL DEFAULT 'EGP',
  mileage                INT NOT NULL DEFAULT 0,
  fuel                   VARCHAR(50) NOT NULL DEFAULT 'Petrol',
  transmission           VARCHAR(50) NOT NULL DEFAULT 'Automatic',
  drivetrain             VARCHAR(50),
  color                  VARCHAR(50) NOT NULL DEFAULT 'White',
  `condition`            VARCHAR(50) NOT NULL DEFAULT 'Used',
  is_new                 TINYINT(1) DEFAULT 0,
  image_url              TEXT,
  images                 JSON,
  videos                 JSON,
  documents              JSON,
  dealership             VARCHAR(255) NOT NULL DEFAULT '',
  city                   VARCHAR(100) NOT NULL DEFAULT '',
  verified               TINYINT(1) DEFAULT 0,
  hp                     INT,
  engine                 VARCHAR(100),
  vin                    VARCHAR(50),
  plate_status           VARCHAR(50),
  seats                  INT DEFAULT 5,
  is_live                TINYINT(1) DEFAULT 0,
  is_sold                TINYINT(1) DEFAULT 0,
  sold_at                DATETIME(3),
  current_bid            DECIMAL(15,2),
  starting_price         DECIMAL(15,2),
  buy_now_price          DECIMAL(15,2),
  reserve_price          DECIMAL(15,2),
  min_raise              DECIMAL(15,2) DEFAULT 10000,
  ends_at                BIGINT,
  viewers                INT DEFAULT 0,
  featured               TINYINT(1) DEFAULT 0,
  accident_history       TINYINT(1) DEFAULT 0,
  paint_condition        VARCHAR(100),
  tire_condition         VARCHAR(100),
  battery_health         INT,
  service_history        TEXT,
  description            TEXT,
  engine_condition       VARCHAR(100),
  transmission_condition VARCHAR(100),
  suspension_condition   VARCHAR(100),
  battery_condition      VARCHAR(100),
  chassis_condition      VARCHAR(100),
  interior_condition     VARCHAR(100),
  previous_owners        INT,
  license_expiry         VARCHAR(50),
  car_options            JSON,
  condition_notes        TEXT,
  created_at             DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. bids
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bids (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  car_id     VARCHAR(255) NOT NULL,
  user_name  VARCHAR(255) NOT NULL,
  amount     DECIMAL(15,2) NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. proxy_bids  (max-bid automation)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proxy_bids (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  car_id     VARCHAR(255) NOT NULL,
  user_name  VARCHAR(255) NOT NULL,
  max_amount DECIMAL(15,2) NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_proxy_bid (car_id, user_name),
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. favorites
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(255) NOT NULL,
  car_id     VARCHAR(255) NOT NULL,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_favorite (user_id, car_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. listing_requests  ("sell your car" submissions)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_requests (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  phone      VARCHAR(50),
  brand      VARCHAR(100) NOT NULL,
  model      VARCHAR(100) NOT NULL,
  year       VARCHAR(10),
  price      VARCHAR(50),
  notes      TEXT,
  status     VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. auction_entry_requests  (deposit proof submissions)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_entry_requests (
  id               INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_name        VARCHAR(255) NOT NULL,
  user_email       VARCHAR(255) NOT NULL,
  car_id           VARCHAR(255) NOT NULL,
  car_title        TEXT NOT NULL,
  proof_image_url  TEXT NOT NULL,
  instapay_number  VARCHAR(255) NOT NULL DEFAULT '',
  status           VARCHAR(50) NOT NULL DEFAULT 'pending',
  deposit_amount   INT NOT NULL DEFAULT 500,
  rejection_reason TEXT,
  created_at       DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_auction_entry (user_email, car_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. site_settings  (key/value admin config)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  `key`  VARCHAR(100) PRIMARY KEY,
  value  TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default settings (safe to re-run)
INSERT IGNORE INTO site_settings (`key`, value) VALUES
  ('deposit_amount',      '500'),
  ('payment_info',        ''),
  ('featured_hero_car_id','');

-- ------------------------------------------------------------
-- 9. deposits  (tracks who paid per car via Stripe)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deposits (
  id                       INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_email               VARCHAR(255) NOT NULL,
  car_id                   VARCHAR(255) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  amount                   INT NOT NULL DEFAULT 500,
  status                   VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at               DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_deposit (user_email, car_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 10. chat_messages  (buyer ↔ admin per car)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  car_id      VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_name  VARCHAR(255) NOT NULL DEFAULT '',
  sender_role ENUM('buyer','admin') NOT NULL,
  message     TEXT NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX chat_messages_car_buyer_idx (car_id, buyer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- Done. All 10 tables created.
-- =============================================================
