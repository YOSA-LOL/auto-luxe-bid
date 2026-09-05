/**
 * Clerk secret key — server-only. Import from auth.server.ts / start.ts, never from client.
 */
import { CLERK_PUBLISHABLE_KEY } from "./clerk-config";

export const CLERK_SECRET_KEY =
  process.env.CLERK_SECRET_KEY ||
  "sk_test_iMw6PIUVizbebHIKKS7759NnaZNHgh4fuhfKG8qsPl";

export { CLERK_PUBLISHABLE_KEY };
