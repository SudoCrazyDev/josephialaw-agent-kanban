import { NextResponse } from "next/server";

import { getCurrentUser, type SessionUser } from "@/lib/auth/session";

/**
 * Use at the top of API route handlers that should only be reachable by a
 * signed-in human. Returns either the user or a 401 Response — caller pattern:
 *
 *   const u = await requireUser();
 *   if (u instanceof Response) return u;
 *   // ... use u as SessionUser
 */
export async function requireUser(): Promise<SessionUser | Response> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return user;
}
