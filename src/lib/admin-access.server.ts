/** Shared admin access rules for server routes and auth. */

import { getDb } from "./db.server";
import { normalizeAdminEmail, anyEmailIsAdmin } from "./admin-access";

export { normalizeAdminEmail, emailIsInAdminList, anyEmailIsAdmin } from "./admin-access";

const PLACEHOLDER_ADMIN_EMAIL = "your-email@example.com";

export function getEnvAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && e !== PLACEHOLDER_ADMIN_EMAIL);
}

/** Env admins only (sync). */
export function getAdminEmails(): string[] {
  return getEnvAdminEmails();
}

/** Env + DB extras (async). */
export async function getMergedAdminEmailsAsync(): Promise<string[]> {
  const env = getEnvAdminEmails();
  try {
    const db = getDb();
    const { rows } = await db.query<{ value: string }>(
      `SELECT value FROM site_settings WHERE \`key\` = 'admin_emails'`,
    );
    if (!rows[0]?.value) return env;
    const extra = JSON.parse(rows[0].value) as string[];
    return [...new Set([...env, ...extra.map((e) => e.toLowerCase())])];
  } catch {
    return env;
  }
}

/** True when email is in env admins or extra DB list */
export function resolveIsAdmin(email: string, extraEmails: string[] = []): boolean {
  if (!email) return false;
  const adminEmails = new Set([...getAdminEmails(), ...extraEmails.map(normalizeAdminEmail)]);
  return adminEmails.has(normalizeAdminEmail(email));
}

export function resolveIsAdminFromEmails(emails: string[], extraEmails: string[] = []): boolean {
  return anyEmailIsAdmin(emails, [...getAdminEmails(), ...extraEmails.map(normalizeAdminEmail)]);
}
