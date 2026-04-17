/**
 * Server-side session helpers — uses next/headers, NOT edge-safe.
 * For middleware, import from ./session-core directly.
 */

import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type SessionUser,
  verifySession
} from "./session-core";

export {
  SESSION_COOKIE_NAME,
  STATE_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  type SessionUser
} from "./session-core";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const c = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!c?.value) return null;
  return verifySession(c.value);
}

export async function setSessionCookie(jwt: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}
