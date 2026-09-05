import { createServerFn } from "@tanstack/react-start";
import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import type { SessionUser } from "./auth";
import { CLERK_SECRET_KEY } from "./clerk-config.server";
import { resolveIsAdminFromEmails, getMergedAdminEmailsAsync } from "./admin-access.server";
import { ensureUserInDb } from "./users.server";

export type { SessionUser };

async function readSessionUser(): Promise<SessionUser | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    const client = clerkClient({ secretKey: CLERK_SECRET_KEY });
    const clerkUser = await client.users.getUser(userId);
    const primary =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      "";
    const allEmails = clerkUser.emailAddresses.map((e) => e.emailAddress).filter(Boolean);
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      "User";
    const phone = clerkUser.phoneNumbers[0]?.phoneNumber ?? null;

    try {
      await ensureUserInDb({ clerkId: clerkUser.id, name, email: primary, phone });
    } catch (err) {
      console.error("[auth] failed to sync user to database:", err);
    }

    const admins = await getMergedAdminEmailsAsync();

    return {
      id: clerkUser.id,
      name,
      email: primary,
      picture: clerkUser.imageUrl ?? undefined,
      isAdmin: resolveIsAdminFromEmails(allEmails, admins),
    };
  } catch {
    return null;
  }
}

export const getUser = createServerFn().handler(readSessionUser);

export const signOut = createServerFn().handler(async (): Promise<void> => {});

/** Client-safe admin gate — uses Clerk session + ADMIN_EMAIL on the server. */
export const checkAdminStatus = createServerFn().handler(async (): Promise<{ isAdmin: boolean }> => {
  const user = await readSessionUser();
  return { isAdmin: Boolean(user?.isAdmin) };
});
