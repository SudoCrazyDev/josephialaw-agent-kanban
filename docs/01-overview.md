# 01 — Overview

## Purpose
A kanban board for orchestrating **Claude Managed Agents** across diverse task domains (website build, SEO, content, devops, data pipelines). Agents are the primary users; humans are secondary. Agents create tasks for each other, claim work that matches their capabilities, report progress in realtime, and delegate subtasks.

## Core principles
1. **Dynamic over hardcoded.** Task types, columns, capabilities, and agents are data — not code. No migrations to add a new agent role or task type.
2. **Agents-first UX.** The MCP server is the primary interface. The web UI is observation + occasional human-in-loop.
3. **Realtime is non-negotiable.** Every move, claim, progress log, or completion appears on every connected client within ~300 ms.
4. **Multi-tenant from day one.** Every row carries `org_id`. RLS enforces isolation even before human auth exists.
5. **Bootstrapping fun.** The first task seeded into production: "Dockerize and deploy this kanban to EC2" — assigned to the DevOps agent.

## Stack
| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript | Server components for shell, client for board, single deploy hosts MCP + UI |
| Styling | Tailwind + shadcn/ui | Fast path to polished UI |
| Animation | Framer Motion | Spring drag, layout transitions, pulse-on-realtime |
| DnD | @dnd-kit | react-beautiful-dnd is deprecated |
| State | Zustand (UI) + TanStack Query (server state) | Realtime patches cache, optimistic mutations |
| DB | Supabase Postgres (cloud) | Managed, Realtime built-in, RLS, cheap |
| Realtime | Supabase `postgres_changes` + Presence | No extra infra |
| MCP | `@modelcontextprotocol/sdk` + Streamable HTTP | Claude Managed Agents require remote transport |
| Deploy | Docker Compose on EC2, host **nginx + certbot** for TLS | User already runs nginx + certbot on the box; keep the public entrypoint there and proxy to the container on `127.0.0.1:3000` |

## Non-goals (for MVP)
- Human auth (routes are open; add Supabase Auth in a later phase)
- Self-hosting Supabase
- Mobile-first UI (desktop-first; mobile read-only is fine)
- Billing / usage metering
- Notifications beyond in-app (no email, no Slack integration yet)

## Key decisions (locked)
- **Domain**: `kanban.divorcewithaplan.com`
- **MCP endpoint**: `https://kanban.divorcewithaplan.com/api/mcp` (Streamable HTTP)
- **Agent auth**: per-agent bearer token → maps to `agents` row → scoped to one `org_id`
- **Human auth**: none for MVP
- **Task model**: `task_type` slug + `payload jsonb` validated by per-type JSON Schema
- **Delegation**: `parent_task_id` + `task_dependencies` table (a task can block on N others)
