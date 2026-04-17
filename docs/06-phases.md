# 06 — Phases

Ordered plan. Each phase is independently shippable and visible.

---

## Phase 0 — Scaffold (half day)

**Goal**: empty app running on localhost + Supabase project + repo ready.

**What to scaffold**
```
agent-kanban/
├── docs/                    (already done)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx         (landing — pick an org)
│   │   ├── [org]/
│   │   │   └── board/
│   │   │       └── [id]/page.tsx
│   │   └── api/
│   │       └── mcp/route.ts (stub)
│   ├── components/
│   │   └── ui/              (shadcn dumps here)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts    (browser anon)
│   │   │   └── server.ts    (service role, server-only)
│   │   └── types.ts         (generated from Supabase)
│   └── styles/globals.css
├── supabase/
│   ├── migrations/          (numbered SQL files)
│   └── seed.sql
├── docker/
│   ├── Dockerfile
│   └── nginx.conf.example
├── docker-compose.yml
├── .env.example
├── next.config.mjs
├── package.json
└── tsconfig.json
```

**Commands**
```bash
pnpm create next-app@latest agent-kanban --typescript --tailwind --app --src-dir --use-pnpm
cd agent-kanban
pnpm dlx shadcn@latest init
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm add framer-motion zustand @tanstack/react-query zod
pnpm add @modelcontextprotocol/sdk
pnpm add -D supabase
```

**Supabase**: create cloud project, capture URL + anon key + service role key → `.env.local`.

**Deliverable**: `pnpm dev` → blank page on `localhost:3000`. MCP stub returns 501 Not Implemented. Repo initialized.

---

## Phase 1 — Schema + seed (half day)

**Goal**: Supabase has all tables, RLS, triggers, and a seeded demo org.

**What to build**
- `supabase/migrations/0001_init.sql` — all tables from [03](./03-database-schema.md)
- `supabase/migrations/0002_rls.sql` — read-any for anon in MVP
- `supabase/migrations/0003_triggers.sql` — `updated_at`, `column_entered_at`, cycle check, payload validation (enable `pg_jsonschema` extension)
- `supabase/migrations/0004_realtime.sql` — publish `tasks`, `task_events`, `comments`, `agents`
- `supabase/seed.sql` — one org (`divorcewithaplan`), 5 task types, one board with 5 columns, 3 agents with capabilities, 8 demo tasks across columns, a few subtasks + dependencies
- Generate types: `supabase gen types typescript --project-id <id> > src/lib/types.ts`

**Deliverable**: Querying Supabase returns seed data. Types compile.

---

## Phase 2 — Static board UI (1–2 days)

**Goal**: Board renders seed data beautifully. No realtime, no DnD yet. Nail the visual.

**What to build**
- `[org]/board/[id]/page.tsx` — server component fetches board + columns + tasks
- `<BoardColumn>`, `<TaskCard>`, `<AgentAvatar>`, `<PriorityBadge>`, `<CapabilityChip>`
- Topbar with static filter chips (non-functional)
- Activity sidebar rendering last 50 `task_events` (static)
- Agent roster dock with static avatars
- Dark mode default via shadcn theming
- Empty states + skeletons

**Deliverable**: Open the URL, see a polished-looking board with seed data. Screenshot-worthy.

---

## Phase 3 — Realtime + optimistic DnD (2–3 days)

**Goal**: Two browser windows open side-by-side; move a card in one, it moves in the other within ~300ms.

**What to build**
- `useBoardRealtime(boardId)` hook — subscribes to `postgres_changes` on `tasks`, `task_events`, `comments`, patches TanStack Query cache
- `<Board>` wraps `<DndContext>` from @dnd-kit; sortable columns, sortable cards within columns
- Drag handlers: optimistic update → Supabase upsert via service-role route handler (`POST /api/tasks/:id/move`) → realtime echoes back as no-op
- Layout animations via `<motion.div layout>` so remote moves glide
- Pulse-on-arrival effect for realtime-induced updates
- Activity sidebar becomes live

**Deliverable**: Demoable two-window realtime drag. This is the wow moment.

---

## Phase 4 — Timers + SLA + presence (1 day)

**Goal**: Cards show elapsed time per column, color shifts with SLA. Agent avatars breathe.

**What to build**
- `<ColumnTimer>` — ticks every 1s, computes elapsed from `column_entered_at`, applies tint
- SLA threshold wired from `columns.sla_seconds`
- Agent heartbeat freshness → avatar animation
- Stale agent (>60s) → gray + "offline" badge; optional cron/edge function auto-releases their tasks

**Deliverable**: A card left alone for a minute visibly degrades through green→amber→red.

---

## Phase 5 — Task detail drawer + create modal (2 days)

**Goal**: Humans can create tasks and drill into existing ones.

**What to build**
- `<TaskDrawer>` with tabs: Timeline, Subtasks, Comments, Payload, DAG
- Timeline renders `task_events` with per-kind icons + actor avatars
- Subtasks tab shows nested tasks, click to navigate
- DAG view uses `reactflow` for dependency visualization
- `<NewTaskModal>` — picks `task_type`, renders form from `payload_schema` via `@rjsf/core`
- Server action or route handler for task creation

**Deliverable**: Fully functional task lifecycle in the UI, without agents yet.

---

## Phase 6 — MCP server (2–3 days)

**Goal**: A real Managed Agent on the Claude Platform can connect and drive the board.

**What to build**
- `app/api/mcp/route.ts` with `@modelcontextprotocol/sdk` Streamable HTTP handler
- `lib/mcp/` directory:
  - `auth.ts` — token hash + lookup
  - `context.ts` — per-request context (agent, orgId, supabase service client)
  - `tools/` — one file per tool group (discovery, claim, delegation, collab, lifecycle)
- Zod schemas for every input
- Every tool handler writes a `task_events` row
- MCP Inspector dev loop via cloudflared tunnel
- Integration test: a scripted agent that creates, claims, progresses, delegates, completes

**Deliverable**: Point a Managed Agent at `https://<tunnel>/api/mcp`, watch it move cards on the live board.

---

## Phase 7 — Agent management UI (1 day)

**Goal**: Humans can register agents and get tokens without touching SQL.

**What to build**
- `/[org]/agents` page: list, create, rotate token, archive
- Token shown once on creation with copy button; after that only `****last4`
- Per-agent capabilities editor (tag input)
- System prompt + model picker (for reference — actual agent provisioning happens on Claude Platform)

**Deliverable**: End-to-end human flow: create agent → copy token → configure Managed Agent on Claude Platform → see it working on the board.

---

## Phase 8 — Deploy to EC2 (1 day, partially by DevOps agent)

**Goal**: `https://kanban.divorcewithaplan.com` live.

**What to build** (see [07](./07-deployment.md) for specifics)
- `docker/Dockerfile` — multi-stage build Next.js standalone
- `docker/nginx.conf.example` — site file for the host's existing nginx (WebSocket / SSE friendly)
- `docker-compose.yml` — single `web` service bound to `127.0.0.1:3000` (host nginx is the public entrypoint)
- `.env.production` template
- GitHub Actions workflow: build image → push to GHCR → SSH deploy to EC2
- DNS A record: `kanban.divorcewithaplan.com` → EC2 public IP

**Bootstrapping moment**: seed production with a single task "Dockerize and deploy this kanban to EC2" assigned to the DevOps Managed Agent. Let it do Phase 8 itself.

**Deliverable**: Public URL, real Managed Agents connected, board live.

---

## Phase 9+ (later, not MVP)
- Supabase Auth + real RLS tightening
- Notifications (email/Slack on block, on @mention, on SLA breach)
- Board templates per industry
- Agent performance analytics (avg task time per capability, success rate)
- Cost tracking per task (Claude API spend)
- Multi-board / cross-board task linking
- Public read-only share links for stakeholders

---

## What NOT to build (keep MVP honest)
- Custom auth screens
- Billing
- Mobile layout
- Slack/email integrations
- Webhook outbound system
- A plugin marketplace for task types
