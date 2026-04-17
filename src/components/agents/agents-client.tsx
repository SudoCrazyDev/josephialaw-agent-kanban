"use client";

import { AlertTriangle, Archive, KeyRound, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AgentAvatar } from "@/components/board/agent-avatar";
import { CapabilityChip } from "@/components/board/capability-chip";
import { NewAgentModal, type NewAgentResult } from "@/components/agents/new-agent-modal";
import { TokenRevealModal } from "@/components/agents/token-reveal-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Agent, Organization } from "@/lib/types";

export function AgentsClient({
  org,
  initialAgents,
  backend
}: {
  org: Organization;
  initialAgents: Agent[];
  backend: "supabase" | "mock";
}) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [modalOpen, setModalOpen] = useState(false);
  const [tokenReveal, setTokenReveal] = useState<{ token: string; name: string; demo: boolean } | null>(null);

  function handleCreated({ agent, token, demo }: NewAgentResult) {
    setAgents((prev) => [{ ...agent, has_token: true }, ...prev]);
    setTokenReveal({ token, name: agent.name, demo: !!demo });
  }

  async function rotate(agent: Agent) {
    const res = await fetch(`/api/agents/${agent.id}/rotate-token`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? "Failed to rotate token");
      return;
    }
    setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, token_last4: json.token_last4, has_token: true } : a));
    setTokenReveal({ token: json.token, name: agent.name, demo: json.demo === true });
  }

  async function archive(agent: Agent) {
    if (!confirm(`Delete agent "${agent.name}"? Its token will stop working immediately. This can't be undone.`)) return;
    const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? "Failed to archive");
      return;
    }
    setAgents((prev) => prev.filter((a) => a.id !== agent.id));
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b border-border bg-background/60 px-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href={`/${org.slug}/board/demo`} className="text-xs text-muted-foreground hover:text-foreground">
            ← Board
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-semibold">{org.name}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm">Agents</span>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus />
          New agent
        </Button>
      </header>

      <div className="mx-auto w-full max-w-5xl px-5 py-8">
        {backend === "mock" && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Using mock agents.</p>
              <p className="mt-0.5 text-amber-200/80">
                Apply the Supabase migrations and restart the dev server so created agents persist and their tokens authenticate MCP requests.
                See <code className="rounded bg-amber-500/20 px-1">docs/03-database-schema.md</code>.
              </p>
            </div>
          </div>
        )}

        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Managed Agents registered to this org. Each one gets a unique bearer token to connect to the MCP server at{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/mcp</code>.
        </p>

        {agents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="mb-3 text-sm text-muted-foreground">No agents yet.</p>
            <Button onClick={() => setModalOpen(true)}>
              <Plus />
              Register your first agent
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {agents.map((agent) => (
              <li
                key={agent.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-card/40 p-3"
              >
                <AgentAvatar agent={agent} size="lg" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{agent.name}</span>
                    <Badge variant="outline" className="text-[10px]">{agent.role}</Badge>
                    {agent.model && (
                      <Badge variant="muted" className="text-[10px] font-mono">{agent.model}</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <code>{agent.slug}</code>
                    <span className="mx-2">·</span>
                    {agent.status === "working" ? "working" :
                     agent.status === "idle" ? "idle" :
                                                "offline"}
                    {agent.current_task_id && <span className="ml-2">on task</span>}
                  </div>
                  {agent.capabilities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {agent.capabilities.map((c) => <CapabilityChip key={c} label={c} />)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 text-xs">
                  {agent.token_last4 ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                      <KeyRound className="size-3" />
                      ****{agent.token_last4}
                    </span>
                  ) : agent.has_token ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                      <KeyRound className="size-3" />
                      token set
                    </span>
                  ) : (
                    <span className="rounded-md border border-dashed border-border px-2 py-0.5 text-muted-foreground">
                      no token
                    </span>
                  )}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => rotate(agent)} title="Rotate token">
                      <KeyRound />
                      <span className="hidden sm:inline">Rotate</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => archive(agent)} title="Archive">
                      <Archive className={cn("text-rose-300")} />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NewAgentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        orgId={org.id}
        onCreated={handleCreated}
      />

      <TokenRevealModal
        token={tokenReveal?.token ?? null}
        agentName={tokenReveal?.name ?? ""}
        demo={tokenReveal?.demo ?? false}
        onClose={() => setTokenReveal(null)}
      />
    </main>
  );
}
