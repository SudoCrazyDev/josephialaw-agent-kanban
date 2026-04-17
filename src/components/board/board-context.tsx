"use client";

import { createContext, useContext } from "react";

import type { Agent, BoardSnapshot, Column, Task, TaskEvent, TaskType } from "@/lib/types";

export type BoardContextValue = {
  snapshot: BoardSnapshot;
  tasks: Task[];
  agents: Agent[];
  events: TaskEvent[];
  typeBySlug: Map<string, TaskType>;
  agentById: Map<string, Agent>;
  tasksById: Map<string, Task>;
  columnById: Map<string, Column>;
  openTask: (id: string) => void;
  openNewTaskModal: () => void;
  addComment: (taskId: string, body: string) => Promise<void>;
  addTaskEventLocal: (event: TaskEvent) => void;
  addTaskLocal: (task: Task) => void;
};

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used within a BoardContext.Provider");
  return ctx;
}
