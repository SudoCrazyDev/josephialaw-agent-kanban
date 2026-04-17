"use client";

import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowRight, CheckCircle2, Circle, GitBranch, GitMerge, Hand, MessageSquare,
  MoveRight, Plus, Send, ShieldAlert, Sparkles, type LucideIcon
} from "lucide-react";
import { useMemo, useState } from "react";

import { AgentAvatar } from "@/components/board/agent-avatar";
import { CapabilityChip } from "@/components/board/capability-chip";
import { DueDateIndicator } from "@/components/board/due-date-indicator";
import { PriorityBadge } from "@/components/board/priority-badge";
import { TaskTypeIcon } from "@/components/board/task-type-icon";
import { useBoard } from "@/components/board/board-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Task, TaskEvent, TaskEventKind } from "@/lib/types";

const iconByKind: Record<TaskEventKind, LucideIcon> = {
  created:            Plus,
  claimed:            Hand,
  released:           Circle,
  moved:              MoveRight,
  progress:           Sparkles,
  commented:          MessageSquare,
  completed:          CheckCircle2,
  blocked:            ShieldAlert,
  assigned:           Hand,
  dependency_added:   GitBranch,
  dependency_removed: GitMerge
};

function timeAgo(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); }
  catch { return iso; }
}

export function TaskDrawer({
  taskId,
  onOpenChange
}: {
  taskId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const board = useBoard();
  const task = taskId ? board.tasksById.get(taskId) : null;

  return (
    <Dialog open={!!task} onOpenChange={onOpenChange}>
      {task && <DrawerBody task={task} />}
    </Dialog>
  );
}

function DrawerBody({ task }: { task: Task }) {
  const board = useBoard();

  const type     = board.typeBySlug.get(task.type) ?? null;
  const column   = board.columnById.get(task.column_id);
  const assignee = task.assignee_agent_id ? board.agentById.get(task.assignee_agent_id) ?? null : null;

  const events = useMemo(
    () => board.events.filter((e) => e.task_id === task.id)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [board.events, task.id]
  );

  const subtasks = useMemo(
    () => board.tasks.filter((t) => t.parent_task_id === task.id),
    [board.tasks, task.id]
  );

  const blockedBy = useMemo(
    () => board.snapshot.dependencies
      .filter((d) => d.task_id === task.id)
      .map((d) => board.tasksById.get(d.blocks_on_task_id))
      .filter((t): t is Task => !!t),
    [board.snapshot.dependencies, board.tasksById, task.id]
  );

  const blocks = useMemo(
    () => board.snapshot.dependencies
      .filter((d) => d.blocks_on_task_id === task.id)
      .map((d) => board.tasksById.get(d.task_id))
      .filter((t): t is Task => !!t),
    [board.snapshot.dependencies, board.tasksById, task.id]
  );

  const comments = events.filter((e) => e.kind === "commented");

  return (
    <DialogContent side="right" className="flex flex-col p-0">
      <header className="space-y-4 border-b border-border px-6 py-5">
        <div className="flex items-center gap-2">
          <TaskTypeIcon icon={type?.icon ?? null} color={type?.color ?? null} />
          <span className="text-xs font-medium text-muted-foreground">{type?.name ?? task.type}</span>
          <PriorityBadge priority={task.priority} />
          <Badge variant="outline" className="ml-auto mr-10 text-[10px]">{column?.name ?? "—"}</Badge>
        </div>
        <DialogTitle className="text-xl font-semibold leading-tight">{task.title}</DialogTitle>
        {task.description && (
          <DialogDescription className="text-sm">{task.description}</DialogDescription>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {assignee ? (
            <div className="flex items-center gap-2 rounded-md border border-border/40 bg-card/40 px-2 py-1">
              <AgentAvatar agent={assignee} size="sm" showStatus />
              <span className="text-xs">{assignee.name}</span>
            </div>
          ) : (
            <span className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">
              Unassigned
            </span>
          )}
          {task.due_at && <DueDateIndicator dueAt={task.due_at} />}
          {task.required_capabilities.map((c) => <CapabilityChip key={c} label={c} />)}
        </div>

        {(task.started_at || task.completed_at) && (
          <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-muted-foreground">
            {task.started_at && !task.completed_at && (
              <span>started {timeAgo(task.started_at)}</span>
            )}
            {task.completed_at && (
              <span>completed {timeAgo(task.completed_at)}</span>
            )}
          </div>
        )}
      </header>

      <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-6 rounded-none border-b-0">
          <TabsTrigger value="timeline">Timeline <span className="ml-1 text-[10px] text-muted-foreground">{events.length}</span></TabsTrigger>
          <TabsTrigger value="comments">Comments <span className="ml-1 text-[10px] text-muted-foreground">{comments.length}</span></TabsTrigger>
          <TabsTrigger value="subtasks">Subtasks <span className="ml-1 text-[10px] text-muted-foreground">{subtasks.length}</span></TabsTrigger>
          <TabsTrigger value="deps">Deps <span className="ml-1 text-[10px] text-muted-foreground">{blockedBy.length + blocks.length}</span></TabsTrigger>
          <TabsTrigger value="payload">Payload</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
          <TabsContent value="timeline"><TimelineTab events={events} /></TabsContent>
          <TabsContent value="comments"><CommentsTab taskId={task.id} comments={comments} /></TabsContent>
          <TabsContent value="subtasks"><SubtasksTab subtasks={subtasks} /></TabsContent>
          <TabsContent value="deps"><DepsTab blockedBy={blockedBy} blocks={blocks} /></TabsContent>
          <TabsContent value="payload"><PayloadTab payload={task.payload} /></TabsContent>
        </div>
      </Tabs>
    </DialogContent>
  );
}

function TimelineTab({ events }: { events: TaskEvent[] }) {
  const board = useBoard();
  if (events.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">No events yet.</p>;
  }
  return (
    <ol className="relative space-y-3 border-l border-border pl-5">
      {events.map((e) => {
        const Icon = iconByKind[e.kind];
        const actor = e.actor_agent_id ? board.agentById.get(e.actor_agent_id) : null;
        return (
          <motion.li
            key={e.id}
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
          >
            <span className="absolute -left-[27px] inline-flex size-5 items-center justify-center rounded-full border border-border bg-card">
              <Icon className="size-3" />
            </span>
            <div className="flex items-center gap-2">
              {actor ? (
                <>
                  <AgentAvatar agent={actor} size="sm" showStatus={false} className="scale-75" />
                  <span className="text-xs font-medium">{actor.slug}</span>
                </>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">system</span>
              )}
              <span className="text-[10px] text-muted-foreground">{e.kind}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(e.created_at)}</span>
            </div>
            {describePayload(e) && (
              <p className="mt-1 text-xs text-muted-foreground">{describePayload(e)}</p>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}

function describePayload(e: TaskEvent): string | null {
  const p = e.payload as Record<string, unknown>;
  if (e.kind === "progress" && typeof p.message === "string") return p.message;
  if (e.kind === "blocked" && typeof p.reason === "string") return `Reason: ${p.reason}`;
  if (e.kind === "completed" && typeof p.result === "string") return `Result: ${p.result}`;
  if (e.kind === "commented" && typeof p.body === "string") return p.body;
  return null;
}

function CommentsTab({ taskId, comments }: { taskId: string; comments: TaskEvent[] }) {
  const board = useBoard();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {comments.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No comments yet.</p>
        )}
        {comments.map((c) => {
          const actor = c.actor_agent_id ? board.agentById.get(c.actor_agent_id) : null;
          const body = (c.payload as { body?: string }).body ?? "";
          return (
            <div key={c.id} className="rounded-md border border-border bg-card/40 p-3">
              <div className="mb-1 flex items-center gap-2">
                {actor ? (
                  <>
                    <AgentAvatar agent={actor} size="sm" showStatus={false} className="scale-75" />
                    <span className="text-xs font-medium">{actor.slug}</span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">human</span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-sm">{body}</p>
            </div>
          );
        })}
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.trim() || submitting) return;
          setSubmitting(true);
          try {
            await board.addComment(taskId, draft.trim());
            setDraft("");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="flex-1"
        />
        <Button type="submit" disabled={!draft.trim() || submitting}>
          <Send />
        </Button>
      </form>
    </div>
  );
}

function SubtasksTab({ subtasks }: { subtasks: Task[] }) {
  const board = useBoard();
  if (subtasks.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">No subtasks.</p>;
  }
  return (
    <ul className="space-y-2">
      {subtasks.map((t) => {
        const type = board.typeBySlug.get(t.type);
        const column = board.columnById.get(t.column_id);
        return (
          <li key={t.id}>
            <button
              onClick={() => board.openTask(t.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md border border-border bg-card/40 p-3 text-left transition",
                "hover:border-ring/40 hover:bg-card"
              )}
            >
              <TaskTypeIcon icon={type?.icon ?? null} color={type?.color ?? null} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.title}</div>
                <div className="text-[10px] text-muted-foreground">{column?.name}</div>
              </div>
              <PriorityBadge priority={t.priority} />
              <ArrowRight className="size-4 text-muted-foreground" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function DepsTab({ blockedBy, blocks }: { blockedBy: Task[]; blocks: Task[] }) {
  const board = useBoard();
  const row = (t: Task) => {
    const type = board.typeBySlug.get(t.type);
    const column = board.columnById.get(t.column_id);
    const done = column?.is_done_column;
    return (
      <li key={t.id}>
        <button
          onClick={() => board.openTask(t.id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md border border-border bg-card/40 p-3 text-left transition",
            "hover:border-ring/40 hover:bg-card"
          )}
        >
          <TaskTypeIcon icon={type?.icon ?? null} color={type?.color ?? null} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{t.title}</div>
            <div className="text-[10px] text-muted-foreground">{column?.name}</div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]",
              done ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
            )}
          >
            {done ? "done" : "open"}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Blocked by ({blockedBy.length})
        </h3>
        {blockedBy.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            No upstream blockers.
          </p>
        ) : (
          <ul className="space-y-2">{blockedBy.map(row)}</ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Blocks ({blocks.length})
        </h3>
        {blocks.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            This task isn&apos;t blocking anyone.
          </p>
        ) : (
          <ul className="space-y-2">{blocks.map(row)}</ul>
        )}
      </section>
    </div>
  );
}

function PayloadTab({ payload }: { payload: Record<string, unknown> }) {
  const json = JSON.stringify(payload, null, 2);
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed">
      <code>{json}</code>
    </pre>
  );
}

// Re-export so BoardClient can compose a single overlay spec if needed.
export { DialogClose as DrawerClose };
