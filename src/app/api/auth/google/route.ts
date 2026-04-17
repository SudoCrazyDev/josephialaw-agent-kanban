/**
 * GET /api/auth/google?next=/<path>
 *   Generates an OAuth state, stores it in a short-lived cookie, and 302s
 *   to Google's authorize endpoint. The state encodes the post-login `next`
 *   path so we can resume the user's intended destination after callback.
 */

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { buildAuthorizeUrl } from "@/lib/auth/google";
import { STATE_COOKIE_NAME } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));

  const nonce = randomBytes(16).toString("base64url");
  // state = nonce . base64(next) — verified on callback
  const state = `${nonce}.${Buffer.from(next).toString("base64url")}`;

  const redirectUri = new URL("/api/auth/callback/google", request.url).toString();
  const authorizeUrl = buildAuthorizeUrl({ state, redirectUri });

  (await cookies()).set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });

  return NextResponse.redirect(authorizeUrl);
}
