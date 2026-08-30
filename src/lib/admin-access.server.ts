/** Shared admin access rules for server routes and auth. */

const PLACEHOLDER_ADMIN_EMAIL = "your-email@example.com";

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && e !== PLACEHOLDER_ADMIN_EMAIL);
}

/** True only when the email is listed in ADMIN_EMAIL in .env */
export function resolveIsAdmin(email: string): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
}
