---
name: pg static import leaking into client bundle
description: Static top-level `import { Pool } from "pg"` in TanStack Start *.server.ts files can leak into the client bundle during Vite cold-start dep scanning, causing "does not provide an export named 'default'" errors.
---

## Symptom
Browser console error on cold start (self-heals after one reload, recurs on next cold restart):
`The requested module '/node_modules/pg/lib/index.js' does not provide an export named 'default'`

## Root cause
A **static top-level** `import { Pool } from "pg"` in a `*.server.ts` file can occasionally leak into the client dependency graph during Vite's cold-start optimizer scan, racing ahead of TanStack Start's server-fn code-splitting. This happens even when the file is only imported from other server files, and even with `ssr.external` / `optimizeDeps.exclude` listing `pg` — those settings reduce but do not reliably eliminate the race.

## Fix
Convert the static `import { Pool } from "pg"` into a **dynamic** `await import("pg")` inside the pool-getter function (lazy singleton), so no static top-level `pg` import exists anywhere in the module graph reachable by the client scanner. This requires making the pool getter `async` and adding `await` at every call site.

**Why:** Tuning `optimizeDeps.include/exclude` and `ssr.external` alone did not fully prevent recurrence across repeated cold restarts; only removing the static import did.

**How to apply:** Any `*.server.ts` file that imports a Node-only DB driver (pg, mysql2, etc.) at the top level should lazy-load it via dynamic import inside the connection-getter function, not via a static import statement.
