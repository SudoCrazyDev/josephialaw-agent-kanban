"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2, Circle, GitBranch, GitMerge, Hand, MessageSquare,
  MoveRight, Plus, ShieldAlert, Sparkles, type LucideIcon
} from "lucide-react";

import { AgentAvatar } from "@/components/board/agent-avatar";
import { cn } from "@/lib/utils";
import type { Agent, Task, TaskEvent, TaskEventKind } from "@/lib/types";
import type { RealtimeStatus } from "@/hooks/use-board-realtime";

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

const toneByKind: Record<TaskEventKind, string> = {
  created:            "text-sky-400 bg-sky-500/10",
  claimed:            "text-violet-400 bg-violet-500/10",
  released:           "text-muted-foreground bg-muted",
  moved:              "text-amber-400 bg-amber-500/10",
  progress:           "text-emerald-400 bg-emerald-500/10",
  commented:          "text-sky-400 bg-sky-500/10",
  completed:          "text-emerald-400 bg-emerald-500/15",
  blocked:            "text-rose-400 bg-rose-500/15",
  assigned:           "text-violet-400 bg-violet-500/10",
  dependency_added:   "text-amber-400 bg-amber-500/10",
  dependency_removed: "text-muted-foreground bg-muted"
};

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function describeEvent(e: TaskEvent, task: Task | null): string {
  switch (e.kind) {
    case "claimed":   return `claimed "${task?.title ?? "task"}"`;
    case "released":  return `released "${task?.title ?? "task"}"`;
    case "moved":     return `moved "${task?.title ?? "task"}"`;
    case "progress":  return String((e.payload as { message?: string }).message ?? "logged progress");
    case "completed": return `completed "${task?.title ?? "task"}"`;
    case "blocked":   return `blocked: ${String((e.payload as { reason?: string }).reason ?? "no reason")}`;
    case "created":   return `created "${task?.title ?? "task"}"`;
    case "commented": return `commented on "${task?.title ?? "task"}"`;
    case "assigned":  return `assigned "${task?.title ?? "task"}"`;
    case "dependency_added":   return "added a dependency";
    case "dependency_removed": return "removed a dependency";
  }
}

export function ActivitySidebar({
  events,
  tasksById,
  agentsById,
  status
}: {
  events: TaskEvent[];
  tasksById: Map<string, Task>;
  agentsById: Map<string, Agent>;
  status: RealtimeStatus;
}) {
  const sorted = [...events]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 50);

  const liveLabel =
    status === "live"       ? { text: "Live",       dot: "bg-emerald-400 animate-breathe" } :
    status === "connecting" ? { text: "Connecting", dot: "bg-amber-400 animate-pulse" } :
    status === "error"      ? { text: "Error",      dot: "bg-rose-400" } :
                              { text: "Offline",    dot: "bg-muted-foreground" };

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card/20">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Activity</h2>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", liveLabel.dot)} />
          {liveLabel.text}
        </span>
      </header>

      <ol className="flex-1 space-y-1 overflow-y-auto p-3">
        <AnimatePresence initial={false}>
          {sorted.map((e) => {
            const Icon = iconByKind[e.kind];
            const tone = toneByKind[e.kind];
            const task = tasksById.get(e.task_id) ?? null;
            const actor = e.actor_agent_id ? agentsById.get(e.actor_agent_id) ?? null : null;

            return (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-md p-2 transition hover:bg-card/50"
              >
                <span className={cn("mt-0.5 inline-flex size-6 items-center justify-center rounded-md", tone)}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {actor ? (
                      <>
                        <AgentAvatar agent={actor} size="sm" showStatus={false} className="scale-75" />
                        <span className="font-medium">{actor.slug}</span>
                      </>
                    ) : (
                      <span className="font-medium text-muted-foreground">system</span>
                    )}
                    <span className="text-muted-foreground">· {relativeTime(e.created_at)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{describeEvent(e, task)}</p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </aside>
  );
}
