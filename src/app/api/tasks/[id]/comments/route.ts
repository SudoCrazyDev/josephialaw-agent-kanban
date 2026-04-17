import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  body: z.string().min(1).max(8000),
  author_agent_id: z.string().uuid().nullable().optional(),
  author_user_id: z.string().uuid().nullable().optional()
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

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    return NextResponse.json({ ok: true, demo: true }, { status: 200 });
  }

  const supabase = createServiceRoleClient();

  // Need org_id to write comment/event; fetch from task
  const { data: task, error: fetchErr } = await supabase
    .from("tasks")
    .select("org_id")
    .eq("id", id)
    .single();

  if (fetchErr || !task) {
    const missingSchema =
      fetchErr?.code === "42P01" ||
      fetchErr?.code === "PGRST205" ||
      (fetchErr?.message ?? "").toLowerCase().includes("schema") ||
      (fetchErr?.message ?? "").toLowerCase().includes("could not find");
    if (missingSchema) {
      return NextResponse.json({ ok: true, demo: true, reason: "supabase_not_ready" }, { status: 200 });
    }
    return NextResponse.json({ error: fetchErr?.message ?? "task_not_found" }, { status: 404 });
  }

  const { data: comment, error: insertErr } = await supabase
    .from("comments")
    .insert({
      org_id: task.org_id,
      task_id: id,
      body: parsed.data.body,
      author_agent_id: parsed.data.author_agent_id ?? null,
      author_user_id: parsed.data.author_user_id ?? null
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message, code: insertErr.code }, { status: 500 });
  }

  // Mirror to task_events for timeline + realtime fan-out
  await supabase.from("task_events").insert({
    org_id: task.org_id,
    task_id: id,
    actor_agent_id: parsed.data.author_agent_id ?? null,
    actor_user_id: parsed.data.author_user_id ?? null,
    kind: "commented",
    payload: { body: parsed.data.body, comment_id: comment.id }
  });

  return NextResponse.json({ ok: true, comment });
}
