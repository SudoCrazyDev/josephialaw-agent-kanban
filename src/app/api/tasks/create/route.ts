import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  org_id: z.string().uuid(),
  board_id: z.string().uuid(),
  column_id: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(3).default(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  required_capabilities: z.array(z.string()).default([]),
  parent_task_id: z.string().uuid().nullable().optional(),
  assignee_agent_id: z.string().uuid().nullable().optional(),
  due_at: z.string().datetime().nullable().optional()
});

export async function POST(req: Request) {
  const u = await requireUser();
  if (u instanceof Response) return u;

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

  // Find current max position in the column for positioning at end
  const { data: existing } = await supabase
    .from("tasks")
    .select("position")
    .eq("column_id", parsed.data.column_id)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existing && existing[0] && typeof existing[0].position === "number"
      ? existing[0].position + 1
      : 0;

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...parsed.data, position: nextPosition })
    .select()
    .single();

  if (error) {
    const missingSchema =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message.toLowerCase().includes("schema") ||
      error.message.toLowerCase().includes("could not find");
    if (missingSchema) {
      return NextResponse.json({ ok: true, demo: true, reason: "supabase_not_ready" }, { status: 200 });
    }
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true, task: data });
}
