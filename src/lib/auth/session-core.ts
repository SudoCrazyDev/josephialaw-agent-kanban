/**
 * Edge-safe session primitives. Used by both Node-runtime route handlers
 * and the Edge-runtime middleware. Do NOT import next/headers here — that
 * would break middleware compilation.
 */

import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "agent_kanban_session";
export const STATE_COOKIE_NAME   = "agent_kanban_oauth_state";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  sub: string;     // Google subject id
  email: string;
  name: string;
  picture: string;
};

function getKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET not configured");
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getKey());
}

export async function verifySession(jwt: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(jwt, getKey());
    if (typeof payload.sub === "string" && typeof payload.email === "string") {
      return {
        sub: payload.sub,
        email: payload.email,
        name: typeof payload.name === "string" ? payload.name : payload.email,
        picture: typeof payload.picture === "string" ? payload.picture : ""
      };
    }
    return null;
  } catch {
    return null;
  }
}
