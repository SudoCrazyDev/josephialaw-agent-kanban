/**
 * Domain types. Mirror the Supabase schema in supabase/migrations/0001_init.sql.
 * After migrations are applied, regen `database.types.ts` and consider
 * deriving these from the generated Row/Insert/Update helpers.
 */

export type Priority = 0 | 1 | 2 | 3;

export type AgentStatus = "idle" | "working" | "offline";

export type TaskEventKind =
  | "created"
  | "claimed"
  | "released"
  | "moved"
  | "progress"
  | "commented"
  | "completed"
  | "blocked"
  | "assigned"
  | "dependency_added"
  | "dependency_removed";

export type Organization = {
  id: string;
  slug: string;
  name: string;
  settings: { accent?: string } & Record<string, unknown>;
};

export type TaskType = {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  payload_schema: Record<string, unknown>;
  default_capabilities: string[];
};

export type Board = {
  id: string;
  org_id: string;
  name: string;
};

export type Column = {
  id: string;
  board_id: string;
  name: string;
  position: number;
  sla_seconds: number | null;
  wip_limit: number | null;
  is_done_column: boolean;
};

export type Agent = {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  role: string;
  capabilities: string[];
  model: string | null;
  status: AgentStatus;
  current_task_id: string | null;
  heartbeat_at: string | null;
  /** Non-sensitive tail of the agent's bearer token (e.g. "3f9k"). Null if no token set. */
  token_last4?: string | null;
  /** Derived server-side from token_hash IS NOT NULL. */
  has_token?: boolean;
};

export type Task = {
  id: string;
  org_id: string;
  board_id: string;
  column_id: string;
  type: string;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  priority: Priority;
  required_capabilities: string[];
  assignee_agent_id: string | null;
  parent_task_id: string | null;
  created_by_agent_id: string | null;
  created_by_user_id: string | null;
  position: number;
  column_entered_at: string;
  started_at: string | null;
  completed_at: string | null;
  due_at: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type TaskDependency = {
  task_id: string;
  blocks_on_task_id: string;
};

export type TaskEvent = {
  id: string;
  org_id: string;
  task_id: string;
  actor_agent_id: string | null;
  actor_user_id: string | null;
  kind: TaskEventKind;
  payload: Record<string, unknown>;
  created_at: string;
};

export type BoardSnapshot = {
  org: Organization;
  board: Board;
  columns: Column[];
  tasks: Task[];
  taskTypes: TaskType[];
  agents: Agent[];
  dependencies: TaskDependency[];
  events: TaskEvent[];
};
