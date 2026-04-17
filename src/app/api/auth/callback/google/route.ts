/**
 * GET /api/auth/callback/google?code=...&state=...
 *   Verifies state matches the cookie, exchanges the code for tokens,
 *   fetches the user profile, applies the allow-list, signs a session JWT,
 *   sets the session cookie, and redirects to the saved `next` path.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isEmailAllowed } from "@/lib/auth/allow-list";
import { exchangeCodeForToken, fetchGoogleUser } from "@/lib/auth/google";
import {
  setSessionCookie,
  signSession,
  STATE_COOKIE_NAME
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decodeNextFromState(state: string): string {
  const parts = state.split(".");
  if (parts.length !== 2) return "/";
  try {
    const decoded = Buffer.from(parts[1], "base64url").toString("utf8");
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/";
    return decoded;
  } catch {
    return "/";
  }
}

function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return err(`google_oauth_error: ${oauthError}`);
  if (!code || !state) return err("missing code or state");

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(STATE_COOKIE_NAME)?.value;
  if (!stateCookie || stateCookie !== state) {
    return err("state_mismatch");
  }
  // One-shot — clear the state cookie regardless of outcome.
  cookieStore.set(STATE_COOKIE_NAME, "", { path: "/", maxAge: 0 });

  const redirectUri = new URL("/api/auth/callback/google", request.url).toString();

  let tokenResp;
  try {
    tokenResp = await exchangeCodeForToken({ code, redirectUri });
  } catch (e) {
    return err(e instanceof Error ? e.message : "token_exchange_failed", 502);
  }

  let google;
  try {
    google = await fetchGoogleUser(tokenResp.access_token);
  } catch (e) {
    return err(e instanceof Error ? e.message : "userinfo_failed", 502);
  }

  if (!google.email_verified) {
    return err("email_not_verified", 403);
  }
  if (!isEmailAllowed(google.email)) {
    return NextResponse.json(
      { error: "not_allowed", detail: `${google.email} is not on the allow-list` },
      { status: 403 }
    );
  }

  const jwt = await signSession({
    sub:     google.sub,
    email:   google.email,
    name:    google.name ?? google.email,
    picture: google.picture ?? ""
  });
  await setSessionCookie(jwt);

  const next = decodeNextFromState(state);
  return NextResponse.redirect(new URL(next, request.url));
}
