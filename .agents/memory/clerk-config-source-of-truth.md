---
name: Clerk config source of truth
description: Where Clerk keys live and why all server auth must import from clerk-config.ts
---

# Clerk Config — Single Source of Truth

`src/lib/clerk-config.ts` exports `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` — the matched pair for the active Clerk instance.

All Clerk-related server modules **must** import from this file:
- `src/start.ts` — passes both to `clerkMiddleware({ secretKey, publishableKey })`
- `src/lib/auth.server.ts` — passes `secretKey` to `clerkClient({ secretKey: CLERK_SECRET_KEY })`
- `src/lib/auction-entry.server.ts` — same pattern for `clerkClient`

**Why:** `process.env.CLERK_SECRET_KEY` is set to a DIFFERENT Clerk app's secret in the Replit secret store. Using it directly in `clerkClient()` causes all Clerk Management API calls to fail with 401, so `getUser()` always returns null and `serverIsAdmin` is always false. The hardcoded matched pair in clerk-config.ts is the correct one.

**How to apply:** When switching Clerk apps, update BOTH constants in `clerk-config.ts` together, and also update the `CLERK_SECRET_KEY` Replit secret to match. Never call `clerkClient()` without `{ secretKey: CLERK_SECRET_KEY }` from clerk-config.
