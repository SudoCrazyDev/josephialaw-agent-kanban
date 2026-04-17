import { notFound } from "next/navigation";

import { AgentsClient } from "@/components/agents/agents-client";
import { getMockBoardSnapshot } from "@/lib/mock-data";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Agent, Organization } from "@/lib/types";

type Props = {
  params: Promise<{ org: string }>;
};

type AgentRowDb = Agent & { token_hash?: string | null };

async function fetchFromSupabase(orgSlug: string): Promise<{ org: Organization; agents: Agent[] } | null> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  const supabase = createServiceRoleClient();

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (orgErr || !org) return null;

  const { data: rows, error: agentsErr } = await supabase
    .from("agents")
    .select("id, org_id, name, slug, role, capabilities, model, status, current_task_id, heartbeat_at, token_last4, token_hash")
    .eq("org_id", org.id)
    .order("created_at", { ascending: true });
  if (agentsErr) return null;

  const agents: Agent[] = (rows as AgentRowDb[] | null ?? []).map((r) => ({
    id: r.id,
    org_id: r.org_id,
    name: r.name,
    slug: r.slug,
    role: r.role,
    capabilities: r.capabilities ?? [],
    model: r.model,
    status: r.status,
    current_task_id: r.current_task_id,
    heartbeat_at: r.heartbeat_at,
    token_last4: r.token_last4 ?? null,
    has_token: !!r.token_hash
  }));

  return { org: org as Organization, agents };
}

export default async function AgentsPage({ params }: Props) {
  const { org: orgSlug } = await params;

  const live = await fetchFromSupabase(orgSlug);
  if (live) {
    return <AgentsClient org={live.org} initialAgents={live.agents} backend="supabase" />;
  }

  // Supabase not ready — fall back to the mock snapshot so the UI is inspectable
  const snap = getMockBoardSnapshot(orgSlug, "demo");
  if (!snap) notFound();
  return <AgentsClient org={snap.org} initialAgents={snap.agents} backend="mock" />;
}
