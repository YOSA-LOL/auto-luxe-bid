/**
 * Clerk publishable key — safe to import from client components.
 *
 * Client (ClerkProvider) and server (clerkMiddleware) must use the same Clerk app.
 * Set VITE_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY together in .env as a matched pair.
 */
export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  "pk_test_cG9zaXRpdmUtcG9zc3VtLTEzLmNsZXJrLmFjY291bnRzLmRldiQ";
