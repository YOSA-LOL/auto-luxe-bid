---
name: AuthGuard SSR hydration fix
description: Pattern for Clerk AuthGuard that avoids React 19 hydration mismatch when Clerk middleware is active.
---

## The Rule
Gate protected routes on `!user && !isSignedIn`, not on `!isLoaded`.

```tsx
// WRONG — causes hydration mismatch for signed-in users
if (!isPublic) {
  if (!isLoaded) return loadingSplash;   // client starts false, server starts true
  if (!isSignedIn) return loadingSplash;
}

// CORRECT — use SSR-provided `user` as stable initial signal
if (!isPublic && !user && !isSignedIn) {
  return loadingSplash;
}
return <Outlet />;
```

**Why:** When Clerk middleware is active the server knows auth state immediately, so SSR renders `<Outlet />` for signed-in users. The client starts with `isLoaded=false` — if the guard keys off `isLoaded` it renders `loadingSplash` first, causing a server/client tree mismatch and the React 19 hydration error ("Hydration failed… Variable input such as Date.now()…").

**How to apply:** The `user` prop comes from the root route's `beforeLoad` (via `context.user`). Pass it down to `AuthGuard`. Once Clerk's JS loads on the client, `isSignedIn` takes over; the `useEffect` redirect still fires correctly for sessions that Clerk invalidates.

**Related:** The redirect effect `if (isLoaded && !isSignedIn && !isPublic) navigate("/sign-in")` remains unchanged — it handles post-load redirects for unauthenticated users.
