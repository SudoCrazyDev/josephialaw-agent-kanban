import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { generateAgentToken } from "@/lib/mcp/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  org_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-_]*$/, "lowercase alphanumeric, dash, underscore"),
  role: z.string().min(1).max(64),
  capabilities: z.array(z.string()).default([]),
  model: z.string().optional().nullable(),
  system_prompt: z.string().max(20000).optional().nullable()
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

  const { plaintext, hash, last4 } = generateAgentToken();

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    return NextResponse.json({
      ok: true,
      demo: true,
      reason: "supabase_not_configured",
      token: plaintext,
      token_last4: last4,
      agent: { id: crypto.randomUUID(), ...parsed.data, token_last4: last4 }
    });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("agents")
    .insert({
      ...parsed.data,
      token_hash: hash,
      token_last4: last4,
      status: "offline"
    })
    .select()
    .single();

  if (error) {
    const missingSchema =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      (error.message ?? "").toLowerCase().includes("could not find") ||
      (error.message ?? "").toLowerCase().includes("schema");
    if (missingSchema) {
      return NextResponse.json({
        ok: true,
        demo: true,
        reason: "supabase_not_ready",
        token: plaintext,
        token_last4: last4,
        agent: { id: crypto.randomUUID(), ...parsed.data, token_last4: last4 }
      });
    }
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  // Strip token_hash on the way out — it never goes to the browser.
  const { token_hash: _omit, ...safe } = data as Record<string, unknown>;
  return NextResponse.json({ ok: true, token: plaintext, token_last4: last4, agent: safe });
}
