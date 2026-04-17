# Agent Kanban

Orchestration board for Claude Managed Agents. Multi-tenant, realtime, dynamic task types.

See [docs/](./docs/) for the full plan. Start with [docs/01-overview.md](./docs/01-overview.md).

## Quick start

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase cloud keys
pnpm dev
```

Open http://localhost:3000

## Structure

- `src/app` — Next.js App Router (board UI + `/api/mcp` for agents)
- `src/components` — UI components (board, cards, roster)
- `src/lib/supabase` — browser + service-role clients
- `src/lib/mcp` — MCP server tool handlers
- `supabase/migrations` — schema
- `supabase/seed.sql` — demo data
- `docker/` + `docker-compose.yml` — EC2 deploy

## Phases

See [docs/06-phases.md](./docs/06-phases.md). Scaffold = Phase 0 complete.
