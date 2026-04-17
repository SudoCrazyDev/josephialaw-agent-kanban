# 03 — Database Schema

All tables live in the **`kanban`** schema (not `public`). Every row carries `org_id` except `organizations` itself. RLS enabled on every table.

> **Supabase client config.** Both the browser client and the service-role client must be created with `db: { schema: "kanban" }`. Also add `kanban` to the exposed schemas in the Supabase dashboard (Settings → API → Exposed schemas) or via `supabase/config.toml`.

## Tables

### `organizations`
| col | type | notes |
|---|---|---|
| id | uuid pk | `gen_random_uuid()` |
| slug | text unique | used in URLs: `/[slug]/board/...` |
| name | text | |
| settings | jsonb | per-org flags |
| created_at | timestamptz | |

### `users` (stub for later auth)
| col | type | notes |
|---|---|---|
| id | uuid pk | matches `auth.users.id` when we add auth |
| email | text | |
| created_at | timestamptz | |

### `org_members`
| col | type | notes |
|---|---|---|
| org_id | uuid fk | |
| user_id | uuid fk | |
| role | text | `owner` · `admin` · `member` |
| PK | (org_id, user_id) | |

### `agents`
The dynamic registry. Adding a new agent role = inserting a row. No code change.
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| org_id | uuid fk | |
| name | text | display name e.g. "DevOps Agent 1" |
| slug | text | unique within org, used in logs |
| role | text | freeform label e.g. `devops`, `content`, `seo` |
| capabilities | text[] | e.g. `['devops.docker','devops.aws','devops.ec2']` |
| model | text | `claude-opus-4-7`, `claude-sonnet-4-6`, etc |
| system_prompt | text | for reference / provisioning |
| token_hash | text | SHA-256 of bearer token, never store plaintext |
| status | text | `idle` · `working` · `offline` |
| current_task_id | uuid fk null | |
| heartbeat_at | timestamptz | |
| created_at | timestamptz | |
| UNIQUE | (org_id, slug) | |

### `task_types`
Dynamic type registry per org.
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| org_id | uuid fk | |
| slug | text | `website.build`, `content.blog-post`, `seo.audit` |
| name | text | display |
| icon | text | lucide icon name |
| color | text | tailwind color class |
| payload_schema | jsonb | JSON Schema for `tasks.payload` of this type |
| default_capabilities | text[] | suggested `required_capabilities` on create |
| UNIQUE | (org_id, slug) | |

### `boards`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| org_id | uuid fk | |
| name | text | |
| created_at | timestamptz | |

### `columns`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| board_id | uuid fk | |
| name | text | `Backlog` · `Ready` · `In Progress` · `Review` · `Done` |
| position | int | ordering |
| sla_seconds | int null | timer threshold — card turns amber past this, red at 2× |
| wip_limit | int null | optional WIP enforcement |
| is_done_column | bool | marks completion for metrics |

### `tasks`
The core entity.
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| org_id | uuid fk | |
| board_id | uuid fk | |
| column_id | uuid fk | |
| type | text fk → task_types.slug | |
| title | text | |
| description | text | |
| payload | jsonb | validated against `task_types.payload_schema` |
| priority | int | 0=low, 1=normal, 2=high, 3=urgent |
| required_capabilities | text[] | agent must satisfy all |
| assignee_agent_id | uuid fk null | |
| parent_task_id | uuid fk null | for subtasks |
| created_by_agent_id | uuid fk null | |
| created_by_user_id | uuid fk null | exactly one of the two `created_by_*` must be set |
| column_entered_at | timestamptz | drives column timer |
| started_at | timestamptz null | set when moved out of Backlog |
| completed_at | timestamptz null | |
| due_at | timestamptz null | |
| result | jsonb null | set on completion |
| created_at | timestamptz | |
| updated_at | timestamptz | trigger-maintained |

### `task_dependencies`
A task blocks on N others. DAG enforced by trigger.
| col | type | notes |
|---|---|---|
| task_id | uuid fk | the blocked one |
| blocks_on_task_id | uuid fk | the prerequisite |
| PK | (task_id, blocks_on_task_id) | |

### `task_events`
Append-only audit + timeline. Drives the activity sidebar.
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| org_id | uuid fk | |
| task_id | uuid fk | |
| actor_agent_id | uuid fk null | |
| actor_user_id | uuid fk null | |
| kind | text | `created` · `claimed` · `moved` · `progress` · `commented` · `completed` · `blocked` · `released` |
| payload | jsonb | kind-specific data (e.g. `{ from_column, to_column }`) |
| created_at | timestamptz | |

### `comments`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| org_id | uuid fk | |
| task_id | uuid fk | |
| author_agent_id | uuid fk null | |
| author_user_id | uuid fk null | |
| body | text | markdown |
| created_at | timestamptz | |

## Indexes (the ones that matter)
- `tasks (org_id, board_id, column_id, position)` — board render
- `tasks (assignee_agent_id)` — agent's current work
- `tasks (required_capabilities)` using GIN — capability match queries
- `task_events (task_id, created_at desc)` — timeline
- `task_events (org_id, created_at desc)` — activity sidebar
- `agents (org_id, heartbeat_at)` — stale-agent cleanup

## RLS (sketch)

**Strategy**: in MVP with no human auth, the browser uses the Supabase anon key. RLS policies must allow SELECT/INSERT/UPDATE scoped by `org_id` derived from the URL (passed as a session variable via RPC, or via an HMAC-signed org cookie set by a Next.js route). Agents never talk to Supabase directly — only through the MCP server, which uses the service role key server-side after validating the bearer token.

```sql
-- anon role can read any org (MVP, no auth) — tighten when auth lands
create policy "anon read orgs" on organizations for select to anon using (true);
create policy "anon read org scoped" on tasks for select to anon using (true);
-- …etc, all read-any in MVP

-- writes from browser: none in MVP. All writes go through Next.js route handlers
-- using service role key, which bypasses RLS. Route handlers enforce org scoping.
```

When human auth lands in Phase 7, swap to: `org_id in (select org_id from org_members where user_id = auth.uid())`.

## Triggers
- `tasks_updated_at` — maintain `updated_at`
- `tasks_enter_column` — on `column_id` change, update `column_entered_at`, insert `task_events` with kind `moved`
- `task_dependencies_no_cycle` — reject cycles via recursive CTE
- `tasks_validate_payload` — validate `payload` against `task_types.payload_schema` using the `pg_jsonschema` extension

## Enable Realtime on
`kanban.tasks`, `kanban.task_events`, `kanban.comments`, `kanban.agents`, `kanban.task_dependencies`

## Applying these migrations on Supabase Cloud

Two options, pick one:

**Option A — Dashboard SQL editor (quickest for MVP):**
1. Open the project dashboard → SQL editor
2. Run each file in order: `0001_init.sql`, `0002_rls.sql`, `0003_triggers.sql`, `0004_realtime.sql`, then `seed.sql`
3. Settings → API → Exposed schemas → add `kanban` (comma-separated)
4. Database → Publications → confirm `supabase_realtime` includes the kanban tables

**Option B — Supabase CLI:**
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
npx supabase db execute --file supabase/seed.sql
```
Then update Settings → API → Exposed schemas to add `kanban`.
