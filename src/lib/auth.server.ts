import { createServerFn } from "@tanstack/react-start";
import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import type { SessionUser } from "./auth";
import { CLERK_SECRET_KEY } from "./clerk-config";
import { resolveIsAdmin } from "./admin-access.server";
import { ensureUserInDb } from "./users.server";

export type { SessionUser };

export const getUser = createServerFn().handler(async (): Promise<SessionUser | null> => {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    const client = clerkClient({ secretKey: CLERK_SECRET_KEY });
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      "User";
    const phone = clerkUser.phoneNumbers[0]?.phoneNumber ?? null;

    // Persist Clerk login to MySQL (non-blocking for auth if DB write fails)
    try {
      await ensureUserInDb({ clerkId: clerkUser.id, name, email, phone });
    } catch (err) {
      console.error("[auth] failed to sync user to database:", err);
    }

    return {
      id: clerkUser.id,
      name,
      email,
      picture: clerkUser.imageUrl ?? undefined,
      isAdmin: resolveIsAdmin(email),
    };
  } catch {
    return null;
  }
});

export const signOut = createServerFn().handler(async (): Promise<void> => {});
