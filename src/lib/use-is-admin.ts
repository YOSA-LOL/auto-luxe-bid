import { useEffect, useMemo, useState } from "react";
import type { UserResource } from "@clerk/types";
import { checkAdminStatus } from "@/lib/auth.server";
import { resolveClientIsAdmin } from "@/lib/admin-access";

/** Admin gate for UI — Clerk email + VITE_ADMIN_EMAIL + optional server confirmation. */
export function useIsAdmin(options: {
  clerkUser: UserResource | null | undefined;
  isLoaded: boolean;
  ssrIsAdmin?: boolean;
  serverAdminEmails?: string[];
  fallbackEmail?: string;
}) {
  const { clerkUser, isLoaded, ssrIsAdmin, serverAdminEmails = [], fallbackEmail } = options;

  const clientIsAdmin = useMemo(
    () => resolveClientIsAdmin(clerkUser, fallbackEmail, serverAdminEmails),
    [clerkUser, fallbackEmail, serverAdminEmails.join(",")],
  );

  const [sessionAdmin, setSessionAdmin] = useState(Boolean(ssrIsAdmin) || clientIsAdmin);

  useEffect(() => {
    setSessionAdmin(Boolean(ssrIsAdmin) || clientIsAdmin);
  }, [ssrIsAdmin, clientIsAdmin]);

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;
    checkAdminStatus()
      .then(({ isAdmin }) => {
        if (isAdmin) setSessionAdmin(true);
      })
      .catch(() => {});
  }, [isLoaded, clerkUser?.id]);

  return sessionAdmin || Boolean(ssrIsAdmin) || clientIsAdmin;
}
