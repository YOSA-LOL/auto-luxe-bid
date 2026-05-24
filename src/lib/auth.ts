import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/start-server-core";
import { redirect } from "@tanstack/react-router";
const SESSION_COOKIE = "apex_session";

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

const getSecret = () => process.env.SESSION_SECRET ?? "apex-default-secret-change-me";

async function getSessionFromCookie(): Promise<SessionUser | null> {
  const cookie = getCookie(SESSION_COOKIE);
  if (!cookie) return null;
  try {
    const dotIndex = cookie.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const data = cookie.slice(0, dotIndex);
    const sig = cookie.slice(dotIndex + 1);
    if (!(await hmacVerify(data, sig, getSecret()))) return null;
    return JSON.parse(atob(data)) as SessionUser;
  } catch {
    return null;
  }
}

async function writeSession(user: SessionUser): Promise<void> {
  const data = btoa(JSON.stringify(user));
  const sig = await hmacSign(data, getSecret());
  setCookie(SESSION_COOKIE, `${data}.${sig}`, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export const getUser = createServerFn({ method: "GET" }).handler(async () => {
  return getSessionFromCookie();
});

export const signIn = createServerFn({ method: "POST" })
  .handler(async (opts: { data: { name: string; email: string } }) => {
    const { name, email } = opts.data;
    if (!name || name.trim().length < 2) throw new Error("Name must be at least 2 characters");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");
    const user: SessionUser = {
      id: btoa(email).replace(/[^a-zA-Z0-9]/g, ""),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=7c3aed&color=fff&size=128`,
    };
    await writeSession(user);
    throw redirect({ to: "/" });
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE);
  throw redirect({ to: "/login" });
});
