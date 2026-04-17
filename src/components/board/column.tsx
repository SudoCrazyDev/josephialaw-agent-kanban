"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { TaskCard } from "@/components/board/task-card";
import { cn } from "@/lib/utils";
import type { Agent, Column as ColumnT, Task, TaskType } from "@/lib/types";

export function BoardColumn({
  column,
  tasks,
  typeBySlug,
  agentById,
  subtaskCounts,
  dependencyCounts,
  pulsingIds
}: {
  column: ColumnT;
  tasks: Task[];
  typeBySlug: Map<string, TaskType>;
  agentById: Map<string, Agent>;
  subtaskCounts: Map<string, number>;
  dependencyCounts: Map<string, number>;
  pulsingIds: Set<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: "column", columnId: column.id }
  });

  const overWip = column.wip_limit != null && tasks.length > column.wip_limit;
  const taskIds = tasks.map((t) => t.id);

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full w-80 shrink-0 flex-col rounded-xl border border-border bg-card/30 p-3 backdrop-blur transition",
        overWip && "border-amber-500/50",
        isOver && "border-ring/60 bg-card/60"
      )}
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">{column.name}</h2>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {tasks.length}
            {column.wip_limit != null && ` / ${column.wip_limit}`}
          </span>
        </div>
        {column.sla_seconds != null && (
          <span className="text-[10px] text-muted-foreground">
            SLA {Math.round(column.sla_seconds / 60)}m
          </span>
        )}
      </header>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
          {tasks.length === 0 ? (
            <div className="flex h-full min-h-24 items-center justify-center rounded-md border border-dashed border-border/60 p-6 text-xs text-muted-foreground">
              Drop tasks here
            </div>
          ) : (
            tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                column={column}
                type={typeBySlug.get(t.type) ?? null}
                assignee={t.assignee_agent_id ? agentById.get(t.assignee_agent_id) ?? null : null}
                subtaskCount={subtaskCounts.get(t.id) ?? 0}
                dependencyCount={dependencyCounts.get(t.id) ?? 0}
                pulsing={pulsingIds.has(t.id)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}
