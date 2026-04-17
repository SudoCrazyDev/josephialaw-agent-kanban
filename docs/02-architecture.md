# 02 — Architecture

## System diagram

```
            ┌──────────────────────────────────────────┐
            │       Claude Platform (Managed Agents)   │
            │   devops · content · seo · web · data…   │
            └────────────────┬─────────────────────────┘
                             │  HTTPS · MCP Streamable HTTP
                             │  Bearer: <per-agent token>
                             ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │        EC2 · kanban.divorcewithaplan.com                        │
 │                                                                  │
 │   ┌─────────────────────┐   docker-compose                       │
 │   │  host nginx         │   ┌──────────────────────────────┐    │
 │   │  + certbot (TLS)    │──▶│  web (Next.js 15)             │    │
 │   │  listens :80 :443   │   │  host :8001 → container :3000 │    │
 │   └─────────────────────┘   │  ┌────────────┐ ┌──────────┐  │    │
 │                             │  │  /app      │ │ /api/mcp │  │    │
 │                             │  │  Board UI  │ │  server  │  │    │
 │                             │  └────────────┘ └──────────┘  │    │
 │                             └─────────────┬──────┬───────────┘    │
 └───────────────────────────────────────────┼──────┼────────────────┘
                                             │      │
                               realtime + writes    │  writes + realtime
                                             ▼      ▼
                            ┌──────────────────────────────────┐
                            │     Supabase Cloud                │
                            │  Postgres · Realtime · RLS        │
                            └──────────────────────────────────┘
```

## Components

### Next.js app (single container)
- **Board UI** (`/app/[org]/board/[board_id]`): React client components, drag-and-drop, realtime subscriptions
- **MCP route** (`/api/mcp`): Streamable HTTP handler from `@modelcontextprotocol/sdk`, validates bearer token, maps to agent row, dispatches tools
- **Internal API routes** (`/api/...`): anything the UI needs that shouldn't go direct to Supabase (rare — mostly UI → Supabase client directly)

### Supabase Cloud
- Postgres with our schema (see [03](./03-database-schema.md))
- Realtime enabled on `tasks`, `task_events`, `comments`, `agents` (heartbeat updates)
- RLS policies enforce `org_id` isolation
- No Supabase Auth used in MVP — we pass the anon key in the browser and rely on RLS + app-layer org scoping from the URL

### Host nginx + certbot
- Already installed on the EC2 box — terminates TLS for `kanban.divorcewithaplan.com`
- Reverse-proxies to the Next.js container on `127.0.0.1:8001`
- Must be configured for long-lived connections: `proxy_http_version 1.1`, `proxy_buffering off`, `proxy_read_timeout 3600s`, and the WebSocket `Upgrade` + `Connection` headers — MCP Streamable HTTP and Supabase realtime both stream responses and default nginx timeouts would cut them off
- Cert renewal handled by certbot's existing timer — no app-level config needed

## Data flow: agent claims a task
1. Agent calls `list_available_tasks()` via MCP (filtered by its capabilities, only unblocked tasks)
2. Agent calls `claim_task(id)` — server updates `tasks.assignee_agent_id`, appends `task_events`
3. Supabase Realtime fires `postgres_changes` on `tasks` and `task_events`
4. Every connected browser patches its TanStack Query cache → card animates to new state, activity sidebar shows the event, agent avatar lights up

## Data flow: agent delegates a subtask
1. Working on parent task, agent calls `create_task({ parent_task_id, type, payload, required_capabilities })`
2. Optionally `add_dependency(parent_task_id, blocks_on: new_task_id)` if parent should wait
3. New card appears on the board; the parent card shows a subtask count badge
4. Another agent with matching capabilities picks it up — same flow as above

## Data flow: human creates a task
1. Human opens `/[org]/board/[board_id]`, clicks "New task"
2. Picks a `task_type`, form is rendered from the type's JSON Schema
3. Submits → direct Supabase insert (RLS scoped by org) → realtime fans out

## Why the MCP server lives in the Next.js app
- One deploy, one domain, one TLS cert
- Shares the same Supabase client + types
- `task_events` writes from MCP tools trigger the same realtime channels the UI already listens to → no extra plumbing

## Failure modes we care about
- **Agent holds a claim and dies**: heartbeat stale > 60s → task auto-released (cron via `pg_cron` or a lightweight worker)
- **Realtime hiccup**: TanStack Query refetches on reconnect
- **Dependency cycle in subtasks**: reject on insert (recursive CTE check in a trigger)
