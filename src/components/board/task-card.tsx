"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GitBranch, Link2 } from "lucide-react";

import { AgentAvatar } from "@/components/board/agent-avatar";
import { useBoard } from "@/components/board/board-context";
import { CapabilityChip } from "@/components/board/capability-chip";
import { ColumnTimer } from "@/components/board/column-timer";
import { DueDateIndicator } from "@/components/board/due-date-indicator";
import { PriorityBadge } from "@/components/board/priority-badge";
import { TaskTypeIcon, typeBarColor } from "@/components/board/task-type-icon";
import { cn } from "@/lib/utils";
import type { Agent, Column, Task, TaskType } from "@/lib/types";

export function TaskCard({
  task,
  column,
  type,
  assignee,
  subtaskCount,
  dependencyCount,
  pulsing = false,
  interactive = true
}: {
  task: Task;
  column: Column;
  type: TaskType | null;
  assignee: Agent | null;
  subtaskCount: number;
  dependencyCount: number;
  pulsing?: boolean;
  /** Disable sortable + onClick for the DragOverlay clone. */
  interactive?: boolean;
}) {
  // DragOverlay clone lives outside DnD context — skip the hook to avoid breakage.
  const sortable = useSortable({ id: task.id, data: { type: "task", task } });
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging
  } = interactive ? sortable : { attributes: {}, listeners: {}, setNodeRef: () => {}, transform: null, transition: undefined, isDragging: false };

  // openTask via context; swallow if called outside BoardContext (e.g. storybook)
  let openTask: ((id: string) => void) | null = null;
  try { openTask = useBoard().openTask; } catch { /* out of context */ }

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition
  };

  const typeColor = type?.color ?? "default";
  const barClass = typeBarColor[typeColor] ?? typeBarColor.default;

  return (
    <motion.article
      layout
      layoutId={interactive ? `task-${task.id}` : undefined}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={interactive ? () => openTask?.(task.id) : undefined}
      animate={
        pulsing
          ? { boxShadow: ["0 0 0 0 hsl(var(--primary) / 0.5)", "0 0 0 14px hsl(var(--primary) / 0)"] }
          : undefined
      }
      transition={{ duration: 1.2, ease: "easeOut" }}
      className={cn(
        "group relative touch-manipulation overflow-hidden rounded-lg border border-border bg-card/80 p-3 shadow-sm transition",
        "hover:border-ring/40 hover:bg-card hover:shadow-md",
        interactive && "cursor-grab active:cursor-grabbing",
        isDragging && "z-50 cursor-grabbing opacity-60 ring-1 ring-ring"
      )}
    >
      <span className={cn("absolute left-0 top-0 h-full w-0.5", barClass)} aria-hidden />

      <header className="mb-2 flex items-center justify-between gap-2 pl-1">
        <div className="flex min-w-0 items-center gap-2">
          <TaskTypeIcon icon={type?.icon ?? null} color={type?.color ?? null} />
          <span className="truncate text-[11px] font-medium text-muted-foreground">
            {type?.name ?? task.type}
          </span>
        </div>
        <PriorityBadge priority={task.priority} />
      </header>

      <h3 className="mb-1 line-clamp-2 pl-1 text-sm font-semibold leading-snug">
        {task.title}
      </h3>

      {task.description && (
        <p className="mb-3 line-clamp-1 pl-1 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}

      {task.required_capabilities.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1 pl-1">
          {task.required_capabilities.slice(0, 3).map((c) => (
            <CapabilityChip key={c} label={c} />
          ))}
          {task.required_capabilities.length > 3 && (
            <CapabilityChip label={`+${task.required_capabilities.length - 3}`} />
          )}
        </div>
      )}

      <footer className="flex items-center justify-between gap-2 pl-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          {assignee ? (
            <AgentAvatar agent={assignee} size="sm" showStatus={false} />
          ) : (
            <span className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground">
              ?
            </span>
          )}
          {subtaskCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px]">
              <GitBranch className="size-3" />
              {subtaskCount}
            </span>
          )}
          {dependencyCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px]">
              <Link2 className="size-3" />
              {dependencyCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {task.due_at && <DueDateIndicator dueAt={task.due_at} />}
          <ColumnTimer enteredAt={task.column_entered_at} slaSeconds={column.sla_seconds} />
        </div>
      </footer>
    </motion.article>
  );
}
