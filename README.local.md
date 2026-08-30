# APEXAuto — Local Development Setup

> Complete guide to run the project on your machine with **MySQL 8.0+**.

---

## Prerequisites

| Tool | Minimum version | Download |
|------|----------------|----------|
| **Node.js** | 20+ | https://nodejs.org |
| **Bun** | 1.1+ | https://bun.sh |
| **MySQL** | 8.0+ | https://dev.mysql.com/downloads/ |

---

## 1 — Clone / unzip the project

```bash
# After unzipping the downloaded file:
cd apexauto          # or whatever you named the folder
```

---

## 2 — Install dependencies

```bash
bun install
```

This installs everything including `mysql2` (the MySQL driver).

---

## 3 — Create the MySQL database

Open MySQL as root:

```bash
mysql -u root -p
```

Then run:

```sql
CREATE DATABASE IF NOT EXISTS apexauto
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
EXIT;
```

---

## 4 — Create all tables

```bash
mysql -u root -p apexauto < schema.mysql.sql
```

This creates all 10 tables and seeds the default `site_settings` rows.

---

## 5 — Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# ── Database ──────────────────────────────────────────────────
# Format: mysql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=mysql://root:yourpassword@127.0.0.1:3306/apexauto

# ── Clerk Authentication ───────────────────────────────────────
# These shared dev keys work out of the box (already in src/lib/clerk-config.ts)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_cG9zaXRpdmUtcG9zc3VtLTEzLmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_iMw6PIUVizbebHIKKS7759NnaZNHgh4fuhfKG8qsPl

# ── Admin Access ───────────────────────────────────────────────
# Comma-separated emails that get /ops-x7k9m2 (admin panel) access
ADMIN_EMAIL=your-email@example.com

# ── Dev Server Port ────────────────────────────────────────────
PORT=5000

# ── Stripe (optional) ─────────────────────────────────────────
# STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_SECRET_KEY=sk_test_...
```

> **No password on MySQL?** Use `mysql://root@127.0.0.1:3306/apexauto` (no `:password`).

---

## 6 — Start the dev server

```bash
bun run dev
```

Open → **http://localhost:5000**

---

## Database URL formats

```
# Local — no password
mysql://root@127.0.0.1:3306/apexauto

# Local — with password
mysql://root:mypassword@127.0.0.1:3306/apexauto

# Local — custom user
mysql://apexuser:apexpass@127.0.0.1:3306/apexauto

# Remote (PlanetScale, Railway, etc.)
mysql://user:pass@host:3306/apexauto
```

---

## Useful MySQL commands

```sql
-- Check all tables were created
USE apexauto;
SHOW TABLES;

-- Preview site_settings seed data
SELECT * FROM site_settings;

-- Drop and recreate (fresh start)
DROP DATABASE apexauto;
CREATE DATABASE apexauto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- then re-run: mysql -u root -p apexauto < schema.mysql.sql
```

---

## Project structure

```
src/
  lib/
    db.server.ts          ← MySQL wrapper (getDb, DbPool, DbClient)
    cars.server.ts        ← Car CRUD + auction logic
    auction-entry.server.ts ← Deposit / entry requests
    chat.server.ts        ← Buyer ↔ admin chat
    favorites.server.ts   ← User favourites
    upload.server.ts      ← File uploads (saved to /public/uploads)
    auth.server.ts        ← Clerk auth helpers
  routes/                 ← TanStack Router pages
schema.mysql.sql          ← MySQL schema (run once)
schema.sql                ← Original PostgreSQL schema (reference only)
.env.example              ← Environment variable template
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Access denied for user 'root'` | Wrong password in `DATABASE_URL` |
| `Unknown database 'apexauto'` | Run step 3 to create the DB |
| `Table doesn't exist` | Run step 4 to import `schema.mysql.sql` |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL service is not running — start it |
| Clerk sign-in loop | Clear browser cookies, or use a fresh incognito window |
| Port 5000 in use | Change `PORT=5001` in `.env` |

### Start MySQL service

```bash
# macOS (Homebrew)
brew services start mysql

# Linux (systemd)
sudo systemctl start mysql

# Windows
net start MySQL80
```
