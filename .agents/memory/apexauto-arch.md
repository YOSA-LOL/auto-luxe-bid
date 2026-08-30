---
name: APEXAuto arch decisions
description: Key non-obvious patterns and decisions across the APEXAuto codebase.
---

## Auth
- Real Clerk auth is active. `CLERK_SECRET_KEY` must match `VITE_CLERK_PUBLISHABLE_KEY` (both from positive-possum-13 instance).
- `src/lib/auth.server.ts` calls `auth()` from `@clerk/tanstack-react-start/server` to get userId, then fetches full user from Clerk API.
- `__root.tsx` `beforeLoad` does server-side redirect: unauthenticated → `/sign-in`, authenticated on public path → `/`.
- Clerk middleware in `start.ts` is conditionally enabled: only activates when `CLERK_SECRET_KEY` starts with `sk_`.

## Client-side stores (localStorage only)
- **Notifications** — `src/lib/notifications.ts` reads/writes `apex_notifications` key.
- **Compare** — `src/lib/compare.ts`, max 3 cars, key `apex_compare`.
- **Recently Viewed** — `src/lib/recently-viewed.ts`, key `apex_recently_viewed`.
- **Price Alerts** — `src/lib/price-alerts.ts`, key `apex_price_alerts`.
- **Saved Searches** — stored in account.tsx directly under `apex_saved_searches`.

## Auction / Proxy Bid
- `proxy_bids` table has unique constraint on `(car_id, user_name)`.
- `placeBidInDb` extends auction by 2 min if bid lands within last 60s.
- `placeBidInDb` reads proxy bids and auto-raises for proxy bidders above the new bid.
- `markExpiredAuctions()` must be called at loader level in any page that shows auction status.

## DB tables added beyond initial schema
- `proxy_bids` — (car_id, user_name, max_amount, created_at) UNIQUE(car_id, user_name)
- `notifications` — never implemented in DB; notifications are localStorage-only
- `price_alerts` — never implemented in DB; price alerts are localStorage-only
- `saved_searches` — never implemented in DB; saved searches are localStorage-only
- `cars.is_sold` (bool) + `cars.sold_at` (timestamp) — added via migration

**Why:** Keeping client-side features in localStorage avoids DB complexity for a demo platform while still being functional.
