import { createStart, createMiddleware } from "@tanstack/react-start";
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { renderErrorPage } from "./lib/error-page";
import { CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY } from "./lib/clerk-config";

const CLERK_COOKIE_PREFIXES = ["__session", "__client", "__clerk", "clerk_"];

function isClerkAuthMismatch(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("jwk-kid-mismatch") ||
    message.includes("Handshake token verification failed") ||
    message.includes("keys do not match")
  );
}

function clearClerkCookies(request: Request): Headers {
  const headers = new Headers({ Location: "/" });
  const seen = new Set<string>();

  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (!name) continue;
    if (!CLERK_COOKIE_PREFIXES.some((p) => name === p || name.startsWith(p))) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    );
  }

  // Always clear the common Clerk cookie names even if Cookie header was empty/truncated.
  for (const name of [
    "__session",
    "__client",
    "__client_uat",
    "__clerk_db_jwt",
    "__clerk_handshake",
    "__clerk_handshake_refresh",
  ]) {
    if (seen.has(name)) continue;
    headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    );
  }

  return headers;
}

// Outer wrapper: recover from stale Clerk cookies (key switches) instead of a 500 page.
const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    return await next();
  } catch (error) {
    if (isClerkAuthMismatch(error)) {
      console.warn(
        "[clerk] Stale session cookie for a different Clerk instance — clearing cookies and redirecting.",
      );
      return new Response(null, { status: 302, headers: clearClerkCookies(request) });
    }
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Keys are sourced from src/lib/clerk-config.ts — both middleware and
// auth.server.ts use the same matched pair so server-side admin checks work.
const clerkMw = CLERK_SECRET_KEY
  ? clerkMiddleware({
      secretKey: CLERK_SECRET_KEY,
      publishableKey: CLERK_PUBLISHABLE_KEY,
      signInUrl: "/sign-in",
    })
  : createMiddleware().server(async ({ next }) => next());

export const startInstance = createStart(() => ({
  // errorMiddleware must be outer so it can catch clerkMiddleware handshake throws
  requestMiddleware: [errorMiddleware, clerkMw],
}));
