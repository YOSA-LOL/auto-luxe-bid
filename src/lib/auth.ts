import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie, getRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";

const SESSION_COOKIE = "apex_session";
const STATE_COOKIE = "oauth_state";

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  try {
    const expected = await hmacSign(data, secret);
    return expected === signature;
  } catch {
    return false;
  }
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
};

async function getSessionFromCookie(): Promise<SessionUser | null> {
  const cookie = getCookie(SESSION_COOKIE);
  if (!cookie) return null;
  try {
    const dotIndex = cookie.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const data = cookie.slice(0, dotIndex);
    const sig = cookie.slice(dotIndex + 1);
    const secret = process.env.SESSION_SECRET;
    if (!secret) return null;
    if (!(await hmacVerify(data, sig, secret))) return null;
    return JSON.parse(atob(data)) as SessionUser;
  } catch {
    return null;
  }
}

async function writeSession(user: SessionUser): Promise<void> {
  const data = btoa(JSON.stringify(user));
  const secret = process.env.SESSION_SECRET!;
  const sig = await hmacSign(data, secret);
  setCookie(SESSION_COOKIE, `${data}.${sig}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export const getUser = createServerFn({ method: "GET" }).handler(async () => {
  return getSessionFromCookie();
});

export const getGoogleAuthUrl = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/auth/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");

  const state = crypto.randomUUID();
  setCookie(STATE_COOKIE, state, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");

  return url.toString();
});

export const handleGoogleCallback = createServerFn({ method: "GET" })
  .handler(async (ctx: { data: { code: string; state: string } }) => {
    const { code, state } = ctx.data;
    const savedState = getCookie(STATE_COOKIE);
    if (!savedState || state !== savedState) {
      throw redirect({ to: "/login" });
    }

    const request = getRequest();
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/auth/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (tokens.error || !tokens.access_token) {
      throw redirect({ to: "/login" });
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = (await userRes.json()) as {
      id: string;
      email: string;
      name: string;
      picture: string;
    };

    await writeSession({
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    });
    deleteCookie(STATE_COOKIE);

    throw redirect({ to: "/" });
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE);
  throw redirect({ to: "/login" });
});
