/** Client-safe admin email helpers (no server imports). */

const PLACEHOLDER_ADMIN_EMAIL = "your-email@example.com";

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getClientAdminEmails(): string[] {
  const raw = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined) ?? "";
  return raw
    .split(",")
    .map((e) => normalizeAdminEmail(e))
    .filter((e) => e && e !== PLACEHOLDER_ADMIN_EMAIL);
}

export function emailIsInAdminList(email: string, adminEmails: string[]): boolean {
  if (!email) return false;
  return adminEmails.includes(normalizeAdminEmail(email));
}

export function anyEmailIsAdmin(emails: string[], adminEmails: string[]): boolean {
  return emails.some((email) => emailIsInAdminList(email, adminEmails));
}

export function getClerkEmailList(
  clerkUser: { emailAddresses: { emailAddress: string }[] } | null | undefined,
  fallbackEmail?: string,
): string[] {
  if (clerkUser?.emailAddresses?.length) {
    return clerkUser.emailAddresses.map((e) => e.emailAddress).filter(Boolean);
  }
  return fallbackEmail ? [fallbackEmail] : [];
}

export function resolveClientIsAdmin(
  clerkUser: { emailAddresses: { emailAddress: string }[] } | null | undefined,
  fallbackEmail?: string,
  serverAdminEmails: string[] = [],
): boolean {
  const emails = getClerkEmailList(clerkUser, fallbackEmail);
  if (!emails.length) return false;
  const allAdmins = [...new Set([...getClientAdminEmails(), ...serverAdminEmails.map(normalizeAdminEmail)])];
  return anyEmailIsAdmin(emails, allAdmins);
}
