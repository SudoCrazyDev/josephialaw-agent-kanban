import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session-core";

/**
 * Routes that require an authenticated human. Per-org sub-pages — board, agents.
 * The MCP endpoint, cron endpoint, and auth endpoints handle their own access
 * checks (bearer tokens / shared secret / OAuth dance) and are excluded via
 * the matcher below.
 */
const PROTECTED = /^\/[^/]+\/(board|agents)/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED.test(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (cookie?.value) {
    const user = await verifySession(cookie.value);
    if (user) return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Run on everything except: framework chunks, MCP, cron, auth endpoints,
    // static assets. The handler still no-ops for unprotected paths.
    "/((?!_next/static|_next/image|favicon.ico|api/mcp|api/cron|api/auth|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"
  ]
};
