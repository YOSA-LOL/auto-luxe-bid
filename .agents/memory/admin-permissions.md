---
name: Admin permissions system
description: How admin identity is resolved and enforced in APEXAuto
---

## Rule
Admin identified by: (1) Clerk publicMetadata.role==="admin" OR (2) ADMIN_EMAIL env var (comma-separated). ADMIN_EMAIL=aw7065051@gmail.com is set.

## How to apply
- **auth.server.ts**: `resolveIsAdmin(email, publicMetadata)` checks both; `getUser()` uses `auth()+clerkClient().users.getUser()`.
- **admin.tsx loader**: `context.user ?? getUser()`. If `user && !user.isAdmin` → redirect "/". Also returns `adminEmails` array (from ADMIN_EMAIL env var) in loader data.
- **AdminPage client guard**: `isAdmin = serverIsAdmin || adminEmails.includes(clerkEmail) || publicMetadata.role==="admin"`. Effect redirects only when `isLoaded && clerkUser && !isAdmin`.
- **Dual-path**: Server path works when Clerk keys match. Client path works when server returns null (key mismatch / passthrough) — client email is checked against adminEmails list.
- **start.ts**: Uses CLERK_SECRET_KEY env var with fallback to hardcoded secret that matches the hardcoded publishable key (positive-possum-13 instance).

**Why:** Clerk key mismatch causes getUser() to return null server-side. Client-side adminEmails check ensures the admin email env var works even when server auth fails. The fallback secret in start.ts ensures Clerk middleware works when no env var is set.
