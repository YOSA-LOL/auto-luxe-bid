/**
 * Shared Clerk instance keys.
 *
 * Both clerkMiddleware (start.ts) and server-side auth helpers (auth.server.ts)
 * MUST use the same matched key-pair.  The CLERK_SECRET_KEY *environment variable*
 * may point to a different Clerk app and cause redirect loops — this file is the
 * authoritative source.  Update both constants here when switching Clerk apps.
 *
 * Keep these in sync with VITE_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY in .env
 * (evolving-mudfish-48). The client ClerkProvider reads the Vite env key.
 */
export const CLERK_PUBLISHABLE_KEY =
  "pk_test_ZXZvbHZpbmctbXVkZmlzaC00OC5jbGVyay5hY2NvdW50cy5kZXYk";

export const CLERK_SECRET_KEY =
  "sk_test_lmyTYJHcWmABMJNPsClDqbmoBsqNf3Mfsj3NXrJP8d";
