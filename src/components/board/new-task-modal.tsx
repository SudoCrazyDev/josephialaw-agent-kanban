"use client";

import { useEffect, useMemo, useState } from "react";

import { CapabilityChip } from "@/components/board/capability-chip";
import { FormFromSchema, useSchemaForm } from "@/components/board/form-from-schema";
import { TaskTypeIcon } from "@/components/board/task-type-icon";
import { useBoard } from "@/components/board/board-context";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Priority, Task, TaskType } from "@/lib/types";

export function NewTaskModal({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const board = useBoard();

  const [typeSlug, setTypeSlug]       = useState<string>(board.snapshot.taskTypes[0]?.slug ?? "");
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]       = useState<Priority>(1);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const selectedType = useMemo<TaskType | undefined>(
    () => board.snapshot.taskTypes.find((t) => t.slug === typeSlug),
    [board.snapshot.taskTypes, typeSlug]
  );

  const form = useSchemaForm(
    (selectedType?.payload_schema as Parameters<typeof useSchemaForm>[0]) ?? {}
  );

  // Reset when modal re-opens
  useEffect(() => {
    if (!open) {
      setTitle(""); setDescription(""); setPriority(1); setError(null);
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    if (!selectedType || !title.trim()) {
      setError("Title and type are required");
      return;
    }
    const backlog = board.snapshot.columns.find((c) => c.position === 0);
    if (!backlog) {
      setError("No Backlog column found");
      return;
    }

    setSubmitting(true);
    setError(null);

    const body = {
      org_id: board.snapshot.org.id,
      board_id: board.snapshot.board.id,
      column_id: backlog.id,
      type: selectedType.slug,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      payload: form.values,
      required_capabilities: selectedType.default_capabilities
    };

    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create");

      // Optimistic add (demo mode) — even if realtime isn't live yet.
      const now = new Date().toISOString();
      const newTask: Task = {
        id: json.task?.id ?? crypto.randomUUID(),
        org_id: body.org_id,
        board_id: body.board_id,
        column_id: body.column_id,
        type: body.type,
        title: body.title,
        description: body.description,
        payload: body.payload,
        priority: body.priority,
        required_capabilities: body.required_capabilities,
        assignee_agent_id: null,
        parent_task_id: null,
        created_by_agent_id: null,
        created_by_user_id: null,
        position: board.snapshot.tasks.filter((t) => t.column_id === backlog.id).length,
        column_entered_at: now,
        started_at: null,
        completed_at: null,
        due_at: null,
        result: null,
        created_at: now,
        updated_at: now
      };
      board.addTaskLocal(newTask);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="center" className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Pick a type, then fill in the details.</DialogDescription>
        </DialogHeader>

        {/* Type picker */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {board.snapshot.taskTypes.map((t) => (
            <button
              key={t.slug}
              onClick={() => setTypeSlug(t.slug)}
              className={cn(
                "flex items-center gap-2 rounded-md border p-2 text-left transition",
                t.slug === typeSlug
                  ? "border-ring bg-card"
                  : "border-border bg-card/40 hover:border-ring/40"
              )}
            >
              <TaskTypeIcon icon={t.icon} color={t.color} />
              <span className="truncate text-xs font-medium">{t.name}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="title">Title<span className="ml-1 text-rose-400">*</span></Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as Priority)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value={0}>Low</option>
                <option value={1}>Normal</option>
                <option value={2}>High</option>
                <option value={3}>Urgent</option>
              </select>
            </div>
            <div className="flex-[2] space-y-1">
              <Label>Required capabilities</Label>
              <div className="flex flex-wrap gap-1">
                {(selectedType?.default_capabilities ?? []).map((c) => (
                  <CapabilityChip key={c} label={c} />
                ))}
              </div>
            </div>
          </div>

          {selectedType && (
            <div className="rounded-md border border-border/60 bg-card/30 p-3">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {selectedType.name} payload
              </h4>
              <FormFromSchema
                schema={selectedType.payload_schema as Parameters<typeof FormFromSchema>[0]["schema"]}
                values={form.values}
                onChange={form.setField}
              />
            </div>
          )}

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !title.trim()}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
