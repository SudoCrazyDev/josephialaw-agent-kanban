import { AgentAvatar } from "@/components/board/agent-avatar";
import type { Agent, Task } from "@/lib/types";

export function AgentRoster({
  agents,
  tasksById
}: {
  agents: Agent[];
  tasksById: Map<string, Task>;
}) {
  return (
    <footer className="flex h-20 shrink-0 items-center gap-3 overflow-x-auto border-t border-border bg-card/30 px-5 backdrop-blur">
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Roster
      </span>
      <div className="flex items-center gap-3">
        {agents.map((a) => {
          const currentTask = a.current_task_id ? tasksById.get(a.current_task_id) : null;
          return (
            <div
              key={a.id}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2"
            >
              <AgentAvatar agent={a} size="md" />
              <div className="min-w-0">
                <div className="text-xs font-medium">{a.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {a.status === "working" && currentTask
                    ? currentTask.title
                    : a.status === "offline"
                      ? "offline"
                      : "idle"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </footer>
  );
}
