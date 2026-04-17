# 04 — MCP Server

## Transport + deploy
- **Transport**: Streamable HTTP (current MCP spec). Not stdio, not legacy SSE.
- **Endpoint**: `https://kanban.divorcewithaplan.com/api/mcp`
- **Hosting**: Next.js route handler in the same app as the UI. One deploy.
- **SDK**: `@modelcontextprotocol/sdk` (TypeScript).

## Auth
Per-agent bearer token.

1. When provisioning a Managed Agent in the UI, we generate a random 32-byte token, show it once, and store its SHA-256 hash in `agents.token_hash`.
2. Managed Agent is configured with `Authorization: Bearer <token>` on the MCP connection.
3. Every MCP request is intercepted: hash the incoming token, look up the agent row, attach it to the request context. Reject on miss.
4. All tool handlers operate scoped to that agent's `org_id`. An agent token can never see or touch another org.

Rate-limit per token (e.g. 60 req/s) via Postgres or an in-memory LRU.

## Tools exposed to agents

Grouped by purpose. All tools write a `task_events` row as a side effect so the UI lights up in realtime.

### Discovery
| Tool | Inputs | Returns |
|---|---|---|
| `list_boards` | — | `Board[]` in the agent's org |
| `list_task_types` | — | `TaskType[]` with JSON Schemas |
| `list_agents` | `capabilities?: string[]` | `Agent[]` — for finding peers to delegate to |
| `list_available_tasks` | `board_id?, capabilities?, limit?` | Unclaimed, unblocked tasks whose `required_capabilities` ⊆ requester's capabilities (or a provided filter) |
| `get_task` | `task_id` | Task + events + comments + subtasks |

### Claiming + execution
| Tool | Inputs | Returns |
|---|---|---|
| `claim_task` | `task_id` | ok or conflict (already claimed) |
| `release_task` | `task_id, reason?` | — |
| `update_status` | `task_id, column_slug` | moves card between columns |
| `log_progress` | `task_id, message, data?` | appends to timeline, shows as toast on UI |
| `complete_task` | `task_id, result: jsonb` | moves to Done column, sets `result` |
| `block_task` | `task_id, reason` | moves to `Blocked` column, notifies humans |

### Delegation
| Tool | Inputs | Returns |
|---|---|---|
| `create_task` | `board_id, type, title, description?, payload, required_capabilities?, parent_task_id?, assignee_agent_id?, priority?, due_at?` | new `Task` |
| `assign_task` | `task_id, agent_id` | — |
| `add_dependency` | `task_id, blocks_on_task_id` | — |
| `remove_dependency` | `task_id, blocks_on_task_id` | — |

### Collaboration
| Tool | Inputs | Returns |
|---|---|---|
| `add_comment` | `task_id, body` | `Comment` |
| `list_comments` | `task_id` | `Comment[]` |

### Lifecycle
| Tool | Inputs | Returns |
|---|---|---|
| `heartbeat` | `status?: 'idle'\|'working'` | ok — bumps `agents.heartbeat_at` |
| `whoami` | — | the agent's own row (capabilities, role, etc.) |

## Resources (MCP resources, not tools)
Exposed as readable resources so agents can pull in context without a tool call:
- `task://{id}` — full task payload
- `board://{id}` — current board state snapshot
- `agent://{id}` — another agent's profile (for delegation decisions)

## Request lifecycle (implementation sketch)

```ts
// app/api/mcp/route.ts — Streamable HTTP handler
export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const agent = await authenticateAgent(token); // hash + lookup
  if (!agent) return new Response('Unauthorized', { status: 401 });

  return handleMCP(req, {
    context: { agent, orgId: agent.org_id, supabase: serviceRoleClient },
    tools: /* registered tools above */,
  });
}
```

Every tool handler:
1. Validates inputs against a Zod schema
2. Runs the Supabase mutation with service role (bypasses RLS)
3. Enforces `org_id` match in every query — never trust client-supplied `org_id`
4. Writes a `task_events` row for audit + realtime fanout
5. Returns the updated entity

## What *not* to expose via MCP
- Anything that crosses orgs
- Schema mutations (adding task types is a human/UI action, at least for now)
- Token rotation (human UI only)

## Testing
- MCP Inspector (official tool) pointed at the dev endpoint via cloudflared tunnel
- Unit tests for each tool handler with a mocked Supabase client
- An integration test agent that runs a scripted scenario: create → claim → progress → subtask → complete
