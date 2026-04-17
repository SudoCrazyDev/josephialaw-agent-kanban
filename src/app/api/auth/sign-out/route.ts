import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

// POST is idiomatic for state-changing actions; GET kept for convenience links.
export const POST = handle;
export const GET  = handle;
