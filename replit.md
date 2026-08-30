# APEXAuto — Premium Used Car Auction Platform

A full-stack web application for a premium used car auction platform featuring real-time bidding, verified dealer inventory, and AI-driven price insights.

## Tech Stack

- **Framework**: TanStack Start (SSR) + React 19
- **Routing**: TanStack Router (file-based)
- **Build**: Vite 7 via `@lovable.dev/vite-tanstack-config`
- **Package Manager**: Bun
- **Styling**: Tailwind CSS 4 + Shadcn/Radix UI
- **Database**: PostgreSQL (Replit managed, via `pg` package)
- **State**: TanStack Query + React Hook Form

## Running the App

The app runs on port 5000:
```
bun run dev
```

## Project Structure

- `src/routes/` — File-based page routes (TanStack Router)
- `src/components/` — Reusable UI components
- `src/lib/` — Utility libraries
  - `auth.ts` — Demo auth (always returns a demo user)
  - `favorites.tsx` — Client-side favorites via localStorage
  - `cars.server.ts` — Server functions for DB operations
  - `types.ts` — Shared types + `dbCarToApp` converter
  - `mock-data.ts` — Static car data + formatters
- `src/assets/` — Static images

## Database

Uses Replit's managed PostgreSQL. Tables:
- `cars` — Car listings with auction fields
- `bids` — Bid history per car

Environment variables: `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

## User Preferences

- No emojis in code or comments unless explicitly requested
