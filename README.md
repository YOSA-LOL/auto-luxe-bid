# APEXAuto — Premium Used Car Auction Platform

A full-stack SSR web application for premium used car auctions featuring real-time bidding, live auction rooms, buyer messaging, and a full admin panel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR) + React 19 |
| Routing | TanStack Router (file-based) |
| Build | Vite 7 |
| Package manager | [Bun](https://bun.sh) |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix) |
| Database | PostgreSQL (via `pg`) |
| Auth | [Clerk](https://clerk.com) |
| Payments | Stripe (optional) |

---

## Prerequisites

Install these before you begin:

| Tool | Version | Install |
|---|---|---|
| **Bun** | ≥ 1.1 | `curl -fsSL https://bun.sh/install \| bash` |
| **Node.js** | ≥ 18 | https://nodejs.org (needed by some Vite internals) |
| **PostgreSQL** | ≥ 14 | https://www.postgresql.org/download/ |
| **Git** | any | https://git-scm.com |

> **Windows users:** use [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install) or [Docker](https://www.docker.com) for PostgreSQL.

---

## Quick Start (local development)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in at minimum:

```env
DATABASE_URL=postgresql://localhost:5432/apexauto
ADMIN_EMAIL=your-email@example.com
```

The Clerk keys in `.env.example` are shared development keys that work out of the box — you don't need to change them for local development.

### 4. Create the PostgreSQL database

```bash
# Create the database
createdb apexauto

# Run the schema (creates all 10 tables)
bun run db:setup
# or manually:
psql "$DATABASE_URL" -f schema.sql
```

> If `createdb` isn't in your PATH, use:
> ```bash
> psql -U postgres -c "CREATE DATABASE apexauto;"
> ```

### 5. Start the development server

```bash
bun run dev
```

Open **http://localhost:5000** in your browser.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `ADMIN_EMAIL` | ✅ | Comma-separated admin email(s) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Dev keys pre-set | Clerk publishable key |
| `CLERK_SECRET_KEY` | Dev keys pre-set | Clerk secret key |
| `PORT` | No (default 5000) | Dev server port |
| `STRIPE_PUBLISHABLE_KEY` | No | Stripe (payments feature) |
| `STRIPE_SECRET_KEY` | No | Stripe (payments feature) |

---

## Database

All 10 tables are defined in `schema.sql`.  
The app auto-creates some tables on first request (auction entries, chat messages, site settings, deposits) but **`cars`, `bids`, `proxy_bids`, `favorites`, `listing_requests`, and `users` must be created by running `schema.sql` first.**

### Quick reset (development only)

```bash
dropdb apexauto && createdb apexauto && bun run db:setup
```

---

## Project Structure

```
src/
├── routes/              # File-based pages (TanStack Router)
│   ├── __root.tsx       # Root layout, providers, auth guard
│   ├── index.tsx        # Home page
│   ├── browse.tsx       # Car listings / search
│   ├── auctions.tsx     # Live auction room
│   ├── cars.$carId.tsx  # Car detail + bidding + chat
│   ├── admin.tsx        # Admin panel
│   ├── sell.tsx         # "Sell your car" form
│   ├── account.tsx      # User account page
│   └── ...
├── lib/
│   ├── cars.server.ts          # DB: cars, bids, proxy bids, listing requests
│   ├── auction-entry.server.ts # DB: entry requests, site settings, deposits
│   ├── chat.server.ts          # DB: buyer ↔ admin messages
│   ├── favorites.server.ts     # DB: user favorites
│   ├── auth.server.ts          # Server-side admin check (Clerk)
│   ├── clerk-config.ts         # Clerk key constants (source of truth)
│   ├── language.tsx            # i18n: English + Arabic (RTL)
│   ├── types.ts                # Shared TypeScript types
│   └── mock-data.ts            # Static formatters / helpers
├── components/
│   └── ui/              # shadcn/ui components
├── start.ts             # TanStack Start entry + Clerk middleware
└── server.ts            # Cloudflare-compatible server wrapper
```

---

## Authentication

Authentication is handled by **Clerk**.

- **Sign in / Sign up:** `/sign-in`, `/sign-up`
- **Admin access:** any Clerk account whose email matches `ADMIN_EMAIL` (env var) gets admin rights. The `publicMetadata.role === "admin"` Clerk field also works.
- **Dev keys:** The shared dev Clerk app (`positive-possum-13`) is pre-configured. For production, create your own Clerk application at https://dashboard.clerk.com and update `src/lib/clerk-config.ts` with your keys.

---

## Switching to your own Clerk app

1. Create a new application at https://dashboard.clerk.com
2. Copy your **Publishable Key** and **Secret Key**
3. Edit `src/lib/clerk-config.ts`:
   ```ts
   export const CLERK_PUBLISHABLE_KEY = "pk_live_YOUR_KEY";
   export const CLERK_SECRET_KEY      = "sk_live_YOUR_KEY";
   ```
4. Set the same values in your `.env` (needed for some SDK paths):
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY
   CLERK_SECRET_KEY=sk_live_YOUR_KEY
   ```

---

## Image Uploads

Images are saved to `public/uploads/` at runtime (via `src/lib/upload.server.ts`).  
This folder is git-ignored. On a hosted server, use a persistent volume or swap the upload handler to use a cloud storage service (S3, Cloudflare R2, etc.).

---

## Deployment

The app can be deployed to any Node.js-compatible host.

### Option A — Railway / Render / Fly.io

1. Push the repo to GitHub.
2. Create a new project on your chosen host and link the GitHub repo.
3. Set all environment variables from `.env.example` in the host dashboard.
4. Set the build command: `bun run build`
5. Set the start command: `bun run preview` (or point to `.output/server/index.mjs` for TanStack Start's Nitro output)
6. Create a PostgreSQL database add-on and set `DATABASE_URL`.
7. Run `schema.sql` once against the production database.

### Option B — VPS (DigitalOcean, Linode, Hetzner)

```bash
# On the server
git clone ...
cd YOUR_REPO
bun install
cp .env.example .env   # fill in production values
bun run db:setup       # run schema against prod DB
bun run build
bun run preview        # or use PM2 / systemd
```

### Option C — Supabase / Neon (managed Postgres)

These services give you a `DATABASE_URL` connection string directly.  
Set it in your host's environment and run `schema.sql` via their SQL editor or `psql "$DATABASE_URL" -f schema.sql`.

---

## Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start development server (hot reload) |
| `bun run build` | Production build |
| `bun run preview` | Serve the production build locally |
| `bun run db:setup` | Run `schema.sql` against `$DATABASE_URL` |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

---

## Language Support

The UI supports **English** and **Arabic** (RTL) via the language toggle in the header.  
The selected language is persisted in `localStorage`.

---

## License

Private project — all rights reserved.
