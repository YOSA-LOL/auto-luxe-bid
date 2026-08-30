---
name: Clerk missing secret crashes all routes
description: When CLERK_SECRET_KEY is unset, clerkMiddleware() throws "Missing Clerk Secret Key" on every request, returning 500 for the whole site. Guard with a conditional in start.ts.
---

## The rule
In `src/start.ts`, never pass an empty string to `clerkMiddleware`. Gate it:

```ts
const clerkMw = clerkSecretKey
  ? clerkMiddleware({ secretKey: clerkSecretKey, publishableKey: clerkPublishableKey })
  : createMiddleware().server(async ({ next }) => next());
```

**Why:** When `CLERK_SECRET_KEY` is not set in the environment (e.g. dev machine, or Replit repl where the secret is listed but not injected), `clerkSecretKey` is `""`. Clerk's middleware calls `assertValidSecretKey("")` on every request and throws, making the entire app return 500.

**How to apply:** Any time `start.ts` is created or modified, check that the clerkMiddleware call is conditional. The passthrough middleware keeps the middleware chain intact so `errorMiddleware` still runs.

**Note:** The app uses demo auth ("Alex Hassan" fallback) so running without Clerk is fully intentional in dev.
