"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Agent, Task, TaskEvent } from "@/lib/types";

type Payload<T> = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: T | null; old: T | null };

export type RealtimeHandlers = {
  onTask?: (p: Payload<Task>) => void;
  onTaskEvent?: (p: Payload<TaskEvent>) => void;
  onAgent?: (p: Payload<Agent>) => void;
};

export type RealtimeStatus = "off" | "connecting" | "live" | "error";

/**
 * Subscribes to kanban.{tasks,task_events,agents} postgres_changes for the
 * given board/org. If the browser-safe Supabase env vars are missing we
 * short-circuit to `"off"` — the board still works with local optimistic
 * updates, just without fan-out.
 */
export function useBoardRealtime(
  boardId: string,
  orgId: string,
  handlers: RealtimeHandlers
): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("off");

  useEffect(() => {
    const hasEnv =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!hasEnv) return;

    setStatus("connecting");

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const supabase = createClient();
      const channel = supabase
        .channel(`board:${boardId}`)
        .on(
          // @ts-expect-error — realtime filter signature doesn't include our schema types yet
          "postgres_changes",
          { event: "*", schema: "kanban", table: "tasks", filter: `board_id=eq.${boardId}` },
          (p: { eventType: Payload<Task>["eventType"]; new: Task | null; old: Task | null }) =>
            handlers.onTask?.({ eventType: p.eventType, new: p.new, old: p.old })
        )
        .on(
          // @ts-expect-error — see above
          "postgres_changes",
          { event: "INSERT", schema: "kanban", table: "task_events", filter: `org_id=eq.${orgId}` },
          (p: { eventType: "INSERT"; new: TaskEvent | null; old: TaskEvent | null }) =>
            handlers.onTaskEvent?.({ eventType: "INSERT", new: p.new, old: p.old })
        )
        .on(
          // @ts-expect-error — see above
          "postgres_changes",
          { event: "*", schema: "kanban", table: "agents", filter: `org_id=eq.${orgId}` },
          (p: { eventType: Payload<Agent>["eventType"]; new: Agent | null; old: Agent | null }) =>
            handlers.onAgent?.({ eventType: p.eventType, new: p.new, old: p.old })
        )
        .subscribe((s) => {
          if (cancelled) return;
          if (s === "SUBSCRIBED") setStatus("live");
          else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error");
        });

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // handlers intentionally omitted — consumers should pass stable refs or accept stale closures
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, orgId]);

  return status;
}
