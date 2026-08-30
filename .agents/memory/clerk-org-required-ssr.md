---
name: Clerk SSR auth null — redirect loop fix
description: clerkMiddleware in passthrough mode (no valid sk_ key) causes getUser() to always return null SSR, creating a /sign-in ↔ / redirect loop. Fix with client-side AuthGuard.
---

## Rule
Never put the "not authenticated → redirect to /sign-in" guard in `beforeLoad` (SSR).
Only put the "authenticated on public page → redirect to /" guard there (safe, because server is confident user IS logged in).
The "unauthenticated → sign-in" redirect must live in a client-side `AuthGuard` using `useAuth()`.

## Pattern (in __root.tsx)

```tsx
// beforeLoad — server-safe direction only
beforeLoad: async ({ location, context }) => {
  const user = context.user !== undefined ? context.user : await getUser();
  const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p));
  if (user && isPublic) throw redirect({ to: "/" }); // safe: server knows user IS logged in
  return { user };
},
```

```tsx
// AuthGuard — client-side, handles the other direction
function AuthGuard({ user }) {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (isLoaded && !isSignedIn && !isPublic) {
      navigate({ to: "/sign-in", replace: true });
    }
  }, [isLoaded, isSignedIn, isPublic]);

  // Show loading splash while Clerk initialises on protected routes
  if (!isLoaded && !user && !isPublic) return <LoadingSplash />;

  return <Outlet />;
}
```

**IMPORTANT:** Call `navigate()` only inside `useEffect`, never during render — React throws "Cannot update a component while rendering a different component".

**Why:** When `CLERK_SECRET_KEY` is absent or invalid, `clerkMiddleware` runs as a passthrough. `currentUser()` / `auth()` both return null on every SSR request. If `beforeLoad` redirects unauthenticated users server-side, and Clerk client-side sees a valid session and redirects back to `/`, you get an infinite loop showing just the logo splash.

**How to apply:** Any time the root route's `beforeLoad` is touched, keep only the "user exists + on public page → redirect home" guard server-side. All other auth redirects go in `AuthGuard`.
