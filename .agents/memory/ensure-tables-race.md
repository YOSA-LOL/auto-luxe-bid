---
name: ensureTables parallel race condition
description: Concurrent calls to server functions that each call ensureTables() cause PostgreSQL duplicate-key errors on pg_class. Use a module-level promise singleton.
---

## The rule
Any `*.server.ts` file with `ensureTables()` must use a singleton promise pattern:

```ts
let _tablesReady = false;
let _tablesPromise: Promise<void> | null = null;

async function ensureTables(): Promise<void> {
  if (_tablesReady) return;
  if (_tablesPromise) return _tablesPromise;
  _tablesPromise = (async () => {
    // ... CREATE TABLE IF NOT EXISTS queries ...
    _tablesReady = true;
  })();
  return _tablesPromise;
}
```

**Why:** Route loaders run `Promise.all([fnA(), fnB(), ...])`. If fnA and fnB both call `ensureTables()`, they race to issue `CREATE TABLE IF NOT EXISTS` concurrently. PostgreSQL can still throw `duplicate key value violates unique constraint "pg_class_relname_nsp_index"` even with `IF NOT EXISTS` when both transactions run at the same moment.

**How to apply:** Every new `*.server.ts` that creates tables must use this pattern. Existing files (cars.server.ts etc.) may also have this bug if they're called in parallel from the same loader — check if they have a similar guard.
