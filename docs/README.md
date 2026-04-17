# Agent Kanban — Docs

Planning docs for the Managed Agent orchestration kanban. Read in order.

| # | Doc | What's in it |
|---|-----|--------------|
| 01 | [Overview](./01-overview.md) | Purpose, stack, key decisions, non-goals |
| 02 | [Architecture](./02-architecture.md) | System diagram, components, data flow |
| 03 | [Database schema](./03-database-schema.md) | Tables, relationships, RLS, indexes |
| 04 | [MCP server](./04-mcp-server.md) | Tools exposed to Managed Agents, auth, transport |
| 05 | [UI features](./05-ui-features.md) | Board, animations, filters, agent roster |
| 06 | [Phases](./06-phases.md) | Ordered implementation phases + what to scaffold |
| 07 | [Deployment](./07-deployment.md) | Docker, docker-compose, host nginx + certbot, EC2 |

**Fixed decisions**
- Domain: `kanban.divorcewithaplan.com`
- DB: Supabase **cloud**
- No human auth for MVP (agents authenticate via bearer tokens)
- Host: EC2 (user-owned), Docker Compose
- Multi-tenant from day one
