# APEXAuto — Premium Used Car Auction Platform

A full-stack SSR web application for a car showroom with live auctions, deposit-gated bidding, buyer–admin chat, and a full admin panel.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (SSR) + React 19 |
| Routing | TanStack Router (file-based) |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | **MySQL 8** (via `mysql2`) |
| Auth | Clerk |

## Quick Start

1. Create DB and apply schema:
   ```bash
   npm run db:create
   npm run db:setup
   npm run db:migrate
   ```
2. Copy `.env.example` → `.env` and set:
   - `DATABASE_URL=mysql://user:pass@127.0.0.1:3306/car_showroom`
   - `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
   - `ADMIN_EMAIL=your@email.com`
3. `npm install && npm run dev`

## Auction flow

1. Admin adds car → Go Live
2. Bidder pays deposit (Instapay proof) → admin approves
3. Bidding (server enforces deposit + auth)
4. Auction ends → winner resolved (reserve respected); **not** auto-sold
5. Admin contacts winner → Confirm sale → `/sold` + financials update
6. Loser deposits → pending refund → admin marks refunded

## Scripts

| Script | Purpose |
|---|---|
| `npm run db:migrate` | Apply additive schema migrations |
| `npm run db:seed` | Seed sample cars |
| `npm run build` | Production build |
| `npm run dev` | Local development server |
