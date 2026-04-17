import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  column_id: z.string().uuid(),
  position: z.number().int().min(0),
  actor_agent_id: z.string().uuid().optional(),
  actor_user_id: z.string().uuid().optional()
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 400 });
  }

  // Demo mode: no Supabase configured yet — pretend it worked so Phase 3 UX
  // can be exercised against mock data without the DB live.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    return NextResponse.json({ ok: true, demo: true, id });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ column_id: parsed.data.column_id, position: parsed.data.position })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // Schema/table not created yet (migrations not applied) — degrade gracefully
    // so the board still works with optimistic updates during bring-up.
    const missingSchema =
      error.code === "42P01" /* undefined_table */ ||
      error.code === "PGRST205" /* PostgREST: schema not exposed */ ||
      error.message.toLowerCase().includes("could not find") ||
      error.message.toLowerCase().includes("schema");
    if (missingSchema) {
      return NextResponse.json(
        { ok: true, demo: true, reason: "supabase_not_ready", detail: error.message },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true, task: data });
}
