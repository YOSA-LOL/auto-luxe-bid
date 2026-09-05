import { getDb } from "./db.server";

export type SyncUserInput = {
  clerkId: string;
  name: string;
  email: string;
  phone?: string | null;
};

/**
 * Upsert a Clerk user into the local `users` table.
 * Safe to call on every authenticated request — keyed by clerk_id and email.
 */
export async function ensureUserInDb(user: SyncUserInput): Promise<void> {
  if (!user.clerkId || !user.email) return;

  const db = getDb();
  // Clerk OAuth users — no local password; empty string satisfies NOT NULL legacy column
  await db.query(
    `INSERT INTO users (clerk_id, name, email, password, phone)
     VALUES ($1, $2, $3, '', $4)
     ON DUPLICATE KEY UPDATE
       name     = VALUES(name),
       clerk_id = COALESCE(VALUES(clerk_id), clerk_id),
       email    = VALUES(email),
       phone    = COALESCE(VALUES(phone), phone)`,
    [user.clerkId, user.name, user.email, user.phone ?? null],
  );
}
