/**
 * Releases tasks held by agents whose heartbeat is older than the threshold.
 * Safe to call as often as every 30s.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>  OR  ?secret=<CRON_SECRET>
 *
 * Schedule externally (any one):
 *   - pg_cron (see supabase/migrations/0006_stale_release.sql)
 *   - Vercel Cron / GitHub Actions / Upstash QStash / cron-job.org
 *   - docker-compose sidecar running `curl` on a loop
 */

import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractSecret(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const url = new URL(req.url);
  return url.searchParams.get("secret");
}

async function run(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const provided = extractSecret(req);
  if (provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    return NextResponse.json({ ok: true, demo: true, released_agents: [], released_tasks: [] });
  }

  const url = new URL(req.url);
  const seconds = Number(url.searchParams.get("threshold_seconds") ?? 60);
  const interval = `${Math.max(10, Math.min(3600, seconds))} seconds`;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("release_stale_agents", { stale_threshold: interval });

  if (error) {
    const missingSchema =
      error.code === "42883" /* function does not exist */ ||
      error.code === "PGRST202" /* rpc not found */ ||
      (error.message ?? "").toLowerCase().includes("could not find");
    if (missingSchema) {
      return NextResponse.json(
        { ok: true, demo: true, reason: "migration_0006_not_applied" },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    ok: true,
    threshold: interval,
    released_agents: row?.released_agents ?? [],
    released_tasks: row?.released_tasks ?? [],
    released_agent_count: (row?.released_agents ?? []).length,
    released_task_count: (row?.released_tasks ?? []).length
  });
}

export const GET = run;
export const POST = run;
