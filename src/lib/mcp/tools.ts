/**
 * MCP tool registry. Each tool:
 *  - Declares a Zod input schema (also advertised as JSON Schema to clients).
 *  - Runs under a per-request McpContext (authenticated agent + supabase).
 *  - Must enforce org_id scoping itself (service role bypasses RLS).
 *  - Writes task_events rows as appropriate so the UI lights up via realtime.
 *
 * Ref: docs/04-mcp-server.md
 */

import { z } from "zod";

import type { McpContext } from "@/lib/mcp/context";

// -------------------------------------------------------------------------
// Tool registry
// -------------------------------------------------------------------------

export type ToolDef<I = unknown, O = unknown> = {
  description: string;
  inputSchema: z.ZodType<I>;
  handler: (input: I, ctx: McpContext) => Promise<O>;
};

function tool<I, O>(def: ToolDef<I, O>): ToolDef<I, O> {
  return def;
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

async function assertTaskInOrg(ctx: McpContext, taskId: string) {
  const { data, error } = await ctx.supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("org_id", ctx.agent.org_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`task ${taskId} not found in org`);
  return data;
}

async function writeEvent(
  ctx: McpContext,
  taskId: string,
  kind: string,
  payload: Record<string, unknown> = {}
) {
  await ctx.supabase.from("task_events").insert({
    org_id: ctx.agent.org_id,
    task_id: taskId,
    actor_agent_id: ctx.agent.id,
    kind,
    payload
  });
}

function isSubset(required: string[], have: string[]): boolean {
  const set = new Set(have);
  return required.every((r) => set.has(r));
}

// -------------------------------------------------------------------------
// Tools — Discovery
// -------------------------------------------------------------------------

const listBoards = tool({
  description: "List boards available in the caller's organization.",
  inputSchema: z.object({}).optional().default({}),
  handler: async (_input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("boards")
      .select("*")
      .eq("org_id", ctx.agent.org_id);
    if (error) throw new Error(error.message);
    return { boards: data ?? [] };
  }
});

const listTaskTypes = tool({
  description: "List task types (with JSON Schemas) registered for the org.",
  inputSchema: z.object({}).optional().default({}),
  handler: async (_input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("task_types")
      .select("*")
      .eq("org_id", ctx.agent.org_id);
    if (error) throw new Error(error.message);
    return { task_types: data ?? [] };
  }
});

const listAgents = tool({
  description:
    "List agents in the org. Optionally filter to those whose capabilities include every requested capability — useful for finding peers to delegate to.",
  inputSchema: z.object({
    capabilities: z.array(z.string()).optional(),
    include_offline: z.boolean().optional().default(false)
  }),
  handler: async (input, ctx) => {
    let q = ctx.supabase
      .from("agents_public")
      .select("*")
      .eq("org_id", ctx.agent.org_id);
    if (!input.include_offline) q = q.neq("status", "offline");
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const filtered = (data ?? []).filter((a: { capabilities?: string[] }) =>
      !input.capabilities?.length ? true : isSubset(input.capabilities, a.capabilities ?? [])
    );
    return { agents: filtered };
  }
});

const listAvailableTasks = tool({
  description:
    "List unclaimed, unblocked tasks whose required_capabilities are satisfied by the caller (or an explicit capability set). Use this to find work.",
  inputSchema: z.object({
    board_id: z.string().uuid().optional(),
    capabilities: z.array(z.string()).optional(),
    limit: z.number().int().min(1).max(200).optional().default(50)
  }),
  handler: async (input, ctx) => {
    let q = ctx.supabase
      .from("tasks")
      .select("*")
      .eq("org_id", ctx.agent.org_id)
      .is("assignee_agent_id", null);
    if (input.board_id) q = q.eq("board_id", input.board_id);
    const limit = input.limit ?? 50;
    q = q.order("priority", { ascending: false }).order("created_at", { ascending: true }).limit(limit * 3);
    const { data: tasks, error } = await q;
    if (error) throw new Error(error.message);

    const caps = input.capabilities ?? ctx.agent.capabilities;
    const candidateIds = (tasks ?? []).map((t: { id: string }) => t.id);

    // Determine which are blocked (any dependency not in a done column)
    let blockedTaskIds = new Set<string>();
    if (candidateIds.length) {
      const { data: deps } = await ctx.supabase
        .from("task_dependencies")
        .select("task_id, blocks_on_task_id")
        .in("task_id", candidateIds);

      const blockerIds = Array.from(new Set((deps ?? []).map((d: { blocks_on_task_id: string }) => d.blocks_on_task_id)));
      if (blockerIds.length) {
        const { data: blockers } = await ctx.supabase
          .from("tasks")
          .select("id, column_id")
          .in("id", blockerIds);
        const { data: doneCols } = await ctx.supabase
          .from("columns")
          .select("id")
          .eq("is_done_column", true);
        const doneColSet = new Set((doneCols ?? []).map((c: { id: string }) => c.id));
        const blockerDone = new Map(
          (blockers ?? []).map((b: { id: string; column_id: string }) => [b.id, doneColSet.has(b.column_id)])
        );
        for (const d of deps ?? []) {
          if (!blockerDone.get(d.blocks_on_task_id)) blockedTaskIds.add(d.task_id);
        }
      }
    }

    const filtered = (tasks ?? [])
      .filter((t: { id: string; required_capabilities?: string[] }) => !blockedTaskIds.has(t.id))
      .filter((t: { required_capabilities?: string[] }) => isSubset(t.required_capabilities ?? [], caps))
      .slice(0, limit);

    return { tasks: filtered };
  }
});

const getTask = tool({
  description: "Fetch a task along with its events, comments, subtasks, and dependencies.",
  inputSchema: z.object({ task_id: z.string().uuid() }),
  handler: async (input, ctx) => {
    const task = await assertTaskInOrg(ctx, input.task_id);
    const [events, comments, subtasks, blockedBy, blocks] = await Promise.all([
      ctx.supabase.from("task_events").select("*").eq("task_id", input.task_id).order("created_at", { ascending: false }),
      ctx.supabase.from("comments").select("*").eq("task_id", input.task_id).order("created_at", { ascending: true }),
      ctx.supabase.from("tasks").select("*").eq("parent_task_id", input.task_id),
      ctx.supabase.from("task_dependencies").select("blocks_on_task_id").eq("task_id", input.task_id),
      ctx.supabase.from("task_dependencies").select("task_id").eq("blocks_on_task_id", input.task_id)
    ]);
    return {
      task,
      events: events.data ?? [],
      comments: comments.data ?? [],
      subtasks: subtasks.data ?? [],
      blocked_by: (blockedBy.data ?? []).map((d: { blocks_on_task_id: string }) => d.blocks_on_task_id),
      blocks: (blocks.data ?? []).map((d: { task_id: string }) => d.task_id)
    };
  }
});

// -------------------------------------------------------------------------
// Tools — Claim + execution
// -------------------------------------------------------------------------

const claimTask = tool({
  description:
    "Atomically claim an unclaimed task. Fails if another agent claimed it first.",
  inputSchema: z.object({ task_id: z.string().uuid() }),
  handler: async (input, ctx) => {
    await assertTaskInOrg(ctx, input.task_id);
    const { data, error } = await ctx.supabase
      .from("tasks")
      .update({ assignee_agent_id: ctx.agent.id, started_at: new Date().toISOString() })
      .eq("id", input.task_id)
      .is("assignee_agent_id", null)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("task already claimed or not found");

    await ctx.supabase
      .from("agents")
      .update({ status: "working", current_task_id: input.task_id, heartbeat_at: new Date().toISOString() })
      .eq("id", ctx.agent.id);

    await writeEvent(ctx, input.task_id, "claimed");
    return { ok: true, task: data };
  }
});

const releaseTask = tool({
  description: "Release a task you hold back to the unclaimed pool (optionally with a reason).",
  inputSchema: z.object({ task_id: z.string().uuid(), reason: z.string().optional() }),
  handler: async (input, ctx) => {
    const task = await assertTaskInOrg(ctx, input.task_id);
    if (task.assignee_agent_id !== ctx.agent.id) {
      throw new Error("you do not hold this task");
    }
    const { error } = await ctx.supabase
      .from("tasks")
      .update({ assignee_agent_id: null })
      .eq("id", input.task_id);
    if (error) throw new Error(error.message);

    await ctx.supabase
      .from("agents")
      .update({ status: "idle", current_task_id: null, heartbeat_at: new Date().toISOString() })
      .eq("id", ctx.agent.id);

    await writeEvent(ctx, input.task_id, "released", input.reason ? { reason: input.reason } : {});
    return { ok: true };
  }
});

const updateStatus = tool({
  description:
    "Move the task to a different column. Accepts either column_id (uuid) or column_name (case-insensitive match within the task's board).",
  inputSchema: z
    .object({
      task_id: z.string().uuid(),
      column_id: z.string().uuid().optional(),
      column_name: z.string().optional()
    })
    .refine((v) => !!(v.column_id || v.column_name), { message: "column_id or column_name required" }),
  handler: async (input, ctx) => {
    const task = await assertTaskInOrg(ctx, input.task_id);

    let newColumnId = input.column_id;
    if (!newColumnId && input.column_name) {
      const { data: cols } = await ctx.supabase
        .from("columns")
        .select("id, name")
        .eq("board_id", task.board_id);
      const match = (cols ?? []).find(
        (c: { name: string }) => c.name.toLowerCase() === input.column_name!.toLowerCase()
      );
      if (!match) throw new Error(`no column "${input.column_name}" on this board`);
      newColumnId = match.id;
    }

    const { data, error } = await ctx.supabase
      .from("tasks")
      .update({ column_id: newColumnId })
      .eq("id", input.task_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    // A `moved` event is emitted by the DB trigger on column change.
    return { ok: true, task: data };
  }
});

const logProgress = tool({
  description:
    "Append a progress note to the task timeline. Does not change state; visible in the UI activity sidebar + task timeline.",
  inputSchema: z.object({
    task_id: z.string().uuid(),
    message: z.string().min(1).max(4000),
    data: z.record(z.string(), z.unknown()).optional()
  }),
  handler: async (input, ctx) => {
    await assertTaskInOrg(ctx, input.task_id);
    await writeEvent(ctx, input.task_id, "progress", {
      message: input.message,
      ...(input.data ?? {})
    });
    return { ok: true };
  }
});

const completeTask = tool({
  description: "Complete the task (moves it to the Done column and sets result).",
  inputSchema: z.object({
    task_id: z.string().uuid(),
    result: z.record(z.string(), z.unknown()).optional()
  }),
  handler: async (input, ctx) => {
    const task = await assertTaskInOrg(ctx, input.task_id);
    const { data: doneCol } = await ctx.supabase
      .from("columns")
      .select("id")
      .eq("board_id", task.board_id)
      .eq("is_done_column", true)
      .maybeSingle();
    if (!doneCol) throw new Error("no done column configured on this board");

    const { error } = await ctx.supabase
      .from("tasks")
      .update({
        column_id: doneCol.id,
        completed_at: new Date().toISOString(),
        result: input.result ?? null
      })
      .eq("id", input.task_id);
    if (error) throw new Error(error.message);

    await ctx.supabase
      .from("agents")
      .update({ status: "idle", current_task_id: null, heartbeat_at: new Date().toISOString() })
      .eq("id", ctx.agent.id);

    await writeEvent(ctx, input.task_id, "completed", input.result ? { result: input.result } : {});
    return { ok: true };
  }
});

const blockTask = tool({
  description: "Mark the task as blocked with a reason. Moves it to the Blocked column if one exists.",
  inputSchema: z.object({
    task_id: z.string().uuid(),
    reason: z.string().min(1).max(2000)
  }),
  handler: async (input, ctx) => {
    const task = await assertTaskInOrg(ctx, input.task_id);
    const { data: cols } = await ctx.supabase
      .from("columns")
      .select("id, name")
      .eq("board_id", task.board_id);
    const blocked = (cols ?? []).find((c: { name: string }) => c.name.toLowerCase() === "blocked");

    if (blocked) {
      await ctx.supabase.from("tasks").update({ column_id: blocked.id }).eq("id", input.task_id);
    }
    await writeEvent(ctx, input.task_id, "blocked", { reason: input.reason });
    return { ok: true, moved_to_blocked: !!blocked };
  }
});

// -------------------------------------------------------------------------
// Tools — Delegation
// -------------------------------------------------------------------------

const createTask = tool({
  description:
    "Create a new task. Use parent_task_id to spawn a subtask; use assignee_agent_id to pre-assign to a specific peer.",
  inputSchema: z.object({
    board_id: z.string().uuid(),
    type: z.string().min(1),
    title: z.string().min(1).max(400),
    description: z.string().max(4000).optional(),
    payload: z.record(z.string(), z.unknown()).optional().default({}),
    priority: z.number().int().min(0).max(3).optional().default(1),
    required_capabilities: z.array(z.string()).optional(),
    parent_task_id: z.string().uuid().optional(),
    assignee_agent_id: z.string().uuid().optional(),
    due_at: z.string().datetime().optional()
  }),
  handler: async (input, ctx) => {
    // Find the Backlog column (position 0) on the board
    const { data: backlog } = await ctx.supabase
      .from("columns")
      .select("id")
      .eq("board_id", input.board_id)
      .eq("position", 0)
      .maybeSingle();
    if (!backlog) throw new Error("no backlog column found on board");

    const { data, error } = await ctx.supabase
      .from("tasks")
      .insert({
        org_id: ctx.agent.org_id,
        board_id: input.board_id,
        column_id: backlog.id,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        payload: input.payload ?? {},
        priority: input.priority,
        required_capabilities: input.required_capabilities ?? [],
        parent_task_id: input.parent_task_id ?? null,
        assignee_agent_id: input.assignee_agent_id ?? null,
        created_by_agent_id: ctx.agent.id,
        due_at: input.due_at ?? null
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await writeEvent(ctx, data.id, "created", {
      parent_task_id: input.parent_task_id,
      assignee_agent_id: input.assignee_agent_id
    });
    if (input.assignee_agent_id) {
      await writeEvent(ctx, data.id, "assigned", { agent_id: input.assignee_agent_id });
    }

    return { ok: true, task: data };
  }
});

const assignTask = tool({
  description: "Assign a task to a peer agent in the same org.",
  inputSchema: z.object({
    task_id: z.string().uuid(),
    agent_id: z.string().uuid()
  }),
  handler: async (input, ctx) => {
    await assertTaskInOrg(ctx, input.task_id);

    const { data: targetAgent, error: agentErr } = await ctx.supabase
      .from("agents")
      .select("id, org_id")
      .eq("id", input.agent_id)
      .maybeSingle();
    if (agentErr) throw new Error(agentErr.message);
    if (!targetAgent || targetAgent.org_id !== ctx.agent.org_id) {
      throw new Error("target agent not in your org");
    }

    const { error } = await ctx.supabase
      .from("tasks")
      .update({ assignee_agent_id: input.agent_id })
      .eq("id", input.task_id);
    if (error) throw new Error(error.message);

    await writeEvent(ctx, input.task_id, "assigned", { agent_id: input.agent_id });
    return { ok: true };
  }
});

const addDependency = tool({
  description: "Declare that task_id is blocked by blocks_on_task_id.",
  inputSchema: z.object({
    task_id: z.string().uuid(),
    blocks_on_task_id: z.string().uuid()
  }),
  handler: async (input, ctx) => {
    await assertTaskInOrg(ctx, input.task_id);
    await assertTaskInOrg(ctx, input.blocks_on_task_id);

    const { error } = await ctx.supabase.from("task_dependencies").insert({
      task_id: input.task_id,
      blocks_on_task_id: input.blocks_on_task_id
    });
    if (error) throw new Error(error.message);
    await writeEvent(ctx, input.task_id, "dependency_added", {
      blocks_on_task_id: input.blocks_on_task_id
    });
    return { ok: true };
  }
});

const removeDependency = tool({
  description: "Remove a declared dependency between two tasks.",
  inputSchema: z.object({
    task_id: z.string().uuid(),
    blocks_on_task_id: z.string().uuid()
  }),
  handler: async (input, ctx) => {
    await assertTaskInOrg(ctx, input.task_id);
    const { error } = await ctx.supabase
      .from("task_dependencies")
      .delete()
      .eq("task_id", input.task_id)
      .eq("blocks_on_task_id", input.blocks_on_task_id);
    if (error) throw new Error(error.message);
    await writeEvent(ctx, input.task_id, "dependency_removed", {
      blocks_on_task_id: input.blocks_on_task_id
    });
    return { ok: true };
  }
});

// -------------------------------------------------------------------------
// Tools — Collaboration
// -------------------------------------------------------------------------

const addComment = tool({
  description: "Leave a comment on a task. Visible in the Comments tab and activity sidebar.",
  inputSchema: z.object({
    task_id: z.string().uuid(),
    body: z.string().min(1).max(8000)
  }),
  handler: async (input, ctx) => {
    await assertTaskInOrg(ctx, input.task_id);
    const { data: comment, error } = await ctx.supabase
      .from("comments")
      .insert({
        org_id: ctx.agent.org_id,
        task_id: input.task_id,
        author_agent_id: ctx.agent.id,
        body: input.body
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeEvent(ctx, input.task_id, "commented", { body: input.body, comment_id: comment.id });
    return { ok: true, comment };
  }
});

const listComments = tool({
  description: "List comments on a task (oldest first).",
  inputSchema: z.object({ task_id: z.string().uuid() }),
  handler: async (input, ctx) => {
    await assertTaskInOrg(ctx, input.task_id);
    const { data, error } = await ctx.supabase
      .from("comments")
      .select("*")
      .eq("task_id", input.task_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { comments: data ?? [] };
  }
});

// -------------------------------------------------------------------------
// Tools — Lifecycle
// -------------------------------------------------------------------------

const heartbeat = tool({
  description:
    "Ping to signal liveness. Optionally updates status to idle/working. The UI roster shows 'breathing' avatars for agents heartbeating within the last 30s.",
  inputSchema: z.object({
    status: z.enum(["idle", "working"]).optional()
  }),
  handler: async (input, ctx) => {
    const patch: Record<string, unknown> = { heartbeat_at: new Date().toISOString() };
    if (input.status) patch.status = input.status;
    const { error } = await ctx.supabase.from("agents").update(patch).eq("id", ctx.agent.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  }
});

const whoami = tool({
  description: "Return the caller's agent profile (id, name, role, capabilities, org_id).",
  inputSchema: z.object({}).optional().default({}),
  handler: async (_input, ctx) => {
    return { agent: ctx.agent };
  }
});

// -------------------------------------------------------------------------
// Registry
// -------------------------------------------------------------------------

export const tools: Record<string, ToolDef> = {
  // discovery
  list_boards: listBoards as ToolDef,
  list_task_types: listTaskTypes as ToolDef,
  list_agents: listAgents as ToolDef,
  list_available_tasks: listAvailableTasks as ToolDef,
  get_task: getTask as ToolDef,
  // claim + exec
  claim_task: claimTask as ToolDef,
  release_task: releaseTask as ToolDef,
  update_status: updateStatus as ToolDef,
  log_progress: logProgress as ToolDef,
  complete_task: completeTask as ToolDef,
  block_task: blockTask as ToolDef,
  // delegation
  create_task: createTask as ToolDef,
  assign_task: assignTask as ToolDef,
  add_dependency: addDependency as ToolDef,
  remove_dependency: removeDependency as ToolDef,
  // collab
  add_comment: addComment as ToolDef,
  list_comments: listComments as ToolDef,
  // lifecycle
  heartbeat: heartbeat as ToolDef,
  whoami: whoami as ToolDef
};

export const toolNames = Object.keys(tools);
