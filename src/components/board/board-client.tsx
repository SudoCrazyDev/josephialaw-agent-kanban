"use client";

import {
  DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { LayoutGroup } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";

import { ActivitySidebar } from "@/components/board/activity-sidebar";
import { AgentRoster } from "@/components/board/agent-roster";
import { BoardContext, type BoardContextValue } from "@/components/board/board-context";
import { BoardColumn } from "@/components/board/column";
import { NewTaskModal } from "@/components/board/new-task-modal";
import { TaskCard } from "@/components/board/task-card";
import { TaskDrawer } from "@/components/board/task-drawer";
import { Topbar } from "@/components/board/topbar";
import { useBoardRealtime } from "@/hooks/use-board-realtime";
import type { Agent, BoardSnapshot, Task, TaskEvent } from "@/lib/types";

const PULSE_MS = 1400;
const LOCAL_ECHO_MS = 2500;

export function BoardClient({ initial }: { initial: BoardSnapshot }) {
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [agents, setAgents] = useState<Agent[]>(initial.agents);
  const [events, setEvents] = useState<TaskEvent[]>(initial.events);
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(() => new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  const localMutations = useRef<Map<string, number>>(new Map());

  const markPulsing = useCallback((id: string) => {
    setPulsingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setPulsingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, PULSE_MS);
  }, []);

  const status = useBoardRealtime(initial.board.id, initial.org.id, {
    onTask: ({ eventType, new: row }) => {
      if (!row) return;
      const localTs = localMutations.current.get(row.id);
      const isOwnEcho = localTs != null && Date.now() - localTs < LOCAL_ECHO_MS;

      setTasks((prev) => {
        if (eventType === "DELETE") return prev.filter((t) => t.id !== row.id);
        const exists = prev.some((t) => t.id === row.id);
        return exists ? prev.map((t) => (t.id === row.id ? row : t)) : [...prev, row];
      });
      if (!isOwnEcho) markPulsing(row.id);
    },
    onTaskEvent: ({ new: row }) => {
      if (!row) return;
      setEvents((prev) => [row, ...prev].slice(0, 200));
    },
    onAgent: ({ new: row }) => {
      if (!row) return;
      setAgents((prev) => prev.map((a) => (a.id === row.id ? row : a)));
    }
  });

  // Derived indexes
  const { columns, taskTypes, dependencies } = initial;
  const typeBySlug  = useMemo(() => new Map(taskTypes.map((t) => [t.slug, t])), [taskTypes]);
  const agentById   = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const tasksById   = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const columnById  = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns]
  );

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const arr = map.get(t.column_id) ?? [];
      arr.push(t);
      map.set(t.column_id, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.position - b.position);
    return map;
  }, [tasks]);

  const subtaskCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) if (t.parent_task_id) m.set(t.parent_task_id, (m.get(t.parent_task_id) ?? 0) + 1);
    return m;
  }, [tasks]);

  const dependencyCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of dependencies) m.set(d.task_id, (m.get(d.task_id) ?? 0) + 1);
    return m;
  }, [dependencies]);

  // Context API
  const addTaskEventLocal = useCallback((ev: TaskEvent) => {
    setEvents((prev) => [ev, ...prev]);
  }, []);

  const addTaskLocal = useCallback((task: Task) => {
    setTasks((prev) => [...prev, task]);
    localMutations.current.set(task.id, Date.now());
  }, []);

  const addComment = useCallback(async (taskId: string, body: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      await res.json().catch(() => null);
    } catch {
      /* swallow — optimistic event below still lands */
    }
    // Optimistic event for timeline + activity sidebar
    const ev: TaskEvent = {
      id: `local-${crypto.randomUUID()}`,
      org_id: initial.org.id,
      task_id: taskId,
      actor_agent_id: null,
      actor_user_id: null,
      kind: "commented",
      payload: { body },
      created_at: new Date().toISOString()
    };
    addTaskEventLocal(ev);
  }, [initial.org.id, addTaskEventLocal]);

  const ctx: BoardContextValue = useMemo(() => ({
    snapshot: { ...initial, tasks, agents, events },
    tasks,
    agents,
    events,
    typeBySlug,
    agentById,
    tasksById,
    columnById,
    openTask: (id) => setDrawerTaskId(id),
    openNewTaskModal: () => setNewTaskOpen(true),
    addComment,
    addTaskEventLocal,
    addTaskLocal
  }), [initial, tasks, agents, events, typeBySlug, agentById, tasksById, columnById, addComment, addTaskEventLocal, addTaskLocal]);

  // DnD
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = (e: DragStartEvent) => {
    setDraggingId(String(e.active.id));
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;
    let overColumnId: string | null = null;
    const overData = over.data.current as { type?: string; columnId?: string; task?: Task } | undefined;
    if (overData?.type === "column") overColumnId = overData.columnId ?? null;
    else if (overData?.type === "task") overColumnId = overData.task?.column_id ?? null;
    if (!overColumnId || overColumnId === activeTask.column_id) return;

    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === activeTask.id);
      if (idx === -1) return prev;
      const updated: Task = {
        ...prev[idx],
        column_id: overColumnId!,
        column_entered_at: new Date().toISOString()
      };
      const without = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      return [...without, updated];
    });
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setDraggingId(null);
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overData = over.data.current as { type?: string; columnId?: string; task?: Task } | undefined;
    const finalColumnId =
      overData?.type === "column" ? overData.columnId! :
      overData?.type === "task"   ? overData.task!.column_id :
                                    activeTask.column_id;

    const columnTasks = tasks.filter((t) => t.column_id === finalColumnId).sort((a, b) => a.position - b.position);
    const oldIndex = columnTasks.findIndex((t) => t.id === active.id);
    const overIndex = overData?.type === "task"
      ? columnTasks.findIndex((t) => t.id === over.id)
      : columnTasks.length - 1;
    const newIndex = overIndex === -1 ? columnTasks.length - 1 : overIndex;

    let nextColumnTasks = columnTasks;
    if (oldIndex !== -1 && oldIndex !== newIndex) {
      nextColumnTasks = arrayMove(columnTasks, oldIndex, newIndex);
    }

    const repositioned = new Map<string, number>();
    nextColumnTasks.forEach((t, i) => repositioned.set(t.id, i));

    setTasks((prev) =>
      prev.map((t) =>
        t.column_id === finalColumnId
          ? { ...t, position: repositioned.get(t.id) ?? t.position }
          : t
      )
    );

    const target = nextColumnTasks.find((t) => t.id === active.id);
    if (!target) return;
    const newPos = repositioned.get(target.id) ?? 0;

    localMutations.current.set(target.id, Date.now());

    try {
      await fetch(`/api/tasks/${target.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column_id: finalColumnId, position: newPos })
      });
    } catch {
      /* swallow for now; Phase-3.5 polish adds rollback + toast */
    }
  };

  const draggingTask = draggingId ? tasks.find((t) => t.id === draggingId) ?? null : null;

  return (
    <BoardContext.Provider value={ctx}>
      <div className="flex h-screen flex-col bg-background">
        <Topbar snapshot={ctx.snapshot} onNewTask={() => setNewTaskOpen(true)} />

        <LayoutGroup>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex min-h-0 flex-1">
              <main className="flex min-w-0 flex-1 gap-3 overflow-x-auto p-4">
                {sortedColumns.map((c) => (
                  <BoardColumn
                    key={c.id}
                    column={c}
                    tasks={tasksByColumn.get(c.id) ?? []}
                    typeBySlug={typeBySlug}
                    agentById={agentById}
                    subtaskCounts={subtaskCounts}
                    dependencyCounts={dependencyCounts}
                    pulsingIds={pulsingIds}
                  />
                ))}
              </main>

              <ActivitySidebar
                events={events}
                tasksById={tasksById}
                agentsById={agentById}
                status={status}
              />
            </div>

            <DragOverlay>
              {draggingTask ? (
                <div className="opacity-90">
                  <TaskCard
                    task={draggingTask}
                    column={columnById.get(draggingTask.column_id)!}
                    type={typeBySlug.get(draggingTask.type) ?? null}
                    assignee={draggingTask.assignee_agent_id ? agentById.get(draggingTask.assignee_agent_id) ?? null : null}
                    subtaskCount={subtaskCounts.get(draggingTask.id) ?? 0}
                    dependencyCount={dependencyCounts.get(draggingTask.id) ?? 0}
                    interactive={false}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </LayoutGroup>

        <AgentRoster agents={agents} tasksById={tasksById} />

        <TaskDrawer taskId={drawerTaskId} onOpenChange={(o) => !o && setDrawerTaskId(null)} />
        <NewTaskModal open={newTaskOpen} onOpenChange={setNewTaskOpen} />
      </div>
    </BoardContext.Provider>
  );
}
