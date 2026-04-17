import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/require-user";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  if (u instanceof Response) return u;

  const { id } = await ctx.params;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) {
    const missingSchema =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      (error.message ?? "").toLowerCase().includes("could not find") ||
      (error.message ?? "").toLowerCase().includes("schema");
    if (missingSchema) {
      return NextResponse.json({ ok: true, demo: true, reason: "supabase_not_ready" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
