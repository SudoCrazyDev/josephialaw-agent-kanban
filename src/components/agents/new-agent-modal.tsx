"use client";

import { useState } from "react";

import { CapabilityInput } from "@/components/agents/capability-input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Agent } from "@/lib/types";

export type NewAgentResult = {
  agent: Agent;
  token: string;
  demo?: boolean;
};

const MODELS = [
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001"
];

const ROLES = ["devops", "content", "seo", "web", "data", "qa", "research", "ops", "custom"];

export function NewAgentModal({
  open,
  onOpenChange,
  orgId,
  onCreated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onCreated: (r: NewAgentResult) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [role, setRole] = useState<string>(ROLES[0]);
  const [model, setModel] = useState<string>(MODELS[0]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(""); setSlug(""); setRole(ROLES[0]); setModel(MODELS[0]);
    setCapabilities([]); setSystemPrompt(""); setError(null);
  }

  // Auto-suggest slug from name while the user hasn't hand-edited it
  const [slugTouched, setSlugTouched] = useState(false);
  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, ""));
    }
  }

  async function submit() {
    if (!name.trim() || !slug.trim() || !role) {
      setError("Name, slug, and role are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          name: name.trim(),
          slug: slug.trim(),
          role,
          capabilities,
          model,
          system_prompt: systemPrompt.trim() || null
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create agent");
        return;
      }
      onCreated({ agent: json.agent, token: json.token, demo: json.demo === true });
      onOpenChange(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent side="center" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New agent</DialogTitle>
          <DialogDescription>
            Register a Managed Agent. We&apos;ll generate a bearer token it can use to connect to the MCP server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="name">Name<span className="ml-1 text-rose-400">*</span></Label>
              <Input id="name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="DevOps Agent 2" autoFocus />
            </div>
            <div className="space-y-1">
              <Label htmlFor="slug">Slug<span className="ml-1 text-rose-400">*</span></Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                placeholder="devops-2"
                pattern="^[a-z0-9][a-z0-9-_]*$"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="role">Role<span className="ml-1 text-rose-400">*</span></Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="model">Model</Label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Capabilities</Label>
            <CapabilityInput value={capabilities} onChange={setCapabilities} placeholder="e.g. devops.docker, web.nextjs…" />
            <p className="text-[10px] text-muted-foreground">
              Used by <code className="rounded bg-muted px-1">list_available_tasks</code> to match this agent to work.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="system_prompt">System prompt (reference)</Label>
            <Textarea
              id="system_prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              placeholder="Stored for reference — the actual agent is provisioned on the Claude Platform."
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !name.trim() || !slug.trim()}>
            {submitting ? "Creating…" : "Create & generate token"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
