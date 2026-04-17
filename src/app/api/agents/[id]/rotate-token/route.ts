import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import { generateAgentToken } from "@/lib/mcp/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (u instanceof Response) return u;

  const { id } = await ctx.params;
  const { plaintext, hash, last4 } = generateAgentToken();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    return NextResponse.json({ ok: true, demo: true, token: plaintext, token_last4: last4 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("agents")
    .update({ token_hash: hash, token_last4: last4 })
    .eq("id", id);

  if (error) {
    const missingSchema =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      (error.message ?? "").toLowerCase().includes("could not find") ||
      (error.message ?? "").toLowerCase().includes("schema");
    if (missingSchema) {
      return NextResponse.json({ ok: true, demo: true, reason: "supabase_not_ready", token: plaintext, token_last4: last4 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, token: plaintext, token_last4: last4 });
}
