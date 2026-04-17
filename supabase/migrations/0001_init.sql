-- Agent Kanban — initial schema
-- Ref: docs/03-database-schema.md

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_jsonschema" with schema extensions;

create schema if not exists kanban;

-- =========================================================================
-- organizations
-- =========================================================================
create table kanban.organizations (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  settings   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- users (stub — populated by Supabase Auth when we add it in a later phase)
-- =========================================================================
create table kanban.users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique,
  created_at timestamptz not null default now()
);

create table kanban.org_members (
  org_id  uuid not null references kanban.organizations(id) on delete cascade,
  user_id uuid not null references kanban.users(id) on delete cascade,
  role    text not null check (role in ('owner','admin','member')) default 'member',
  primary key (org_id, user_id)
);

-- =========================================================================
-- agents — dynamic registry of Managed Agents
-- =========================================================================
create table kanban.agents (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references kanban.organizations(id) on delete cascade,
  name            text not null,
  slug            text not null,
  role            text not null,
  capabilities    text[] not null default '{}',
  model           text,
  system_prompt   text,
  token_hash      text unique,
  status          text not null default 'offline' check (status in ('idle','working','offline')),
  current_task_id uuid,
  heartbeat_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (org_id, slug)
);

create index agents_org_idx          on kanban.agents(org_id);
create index agents_heartbeat_idx    on kanban.agents(org_id, heartbeat_at desc);
create index agents_capabilities_idx on kanban.agents using gin (capabilities);

-- =========================================================================
-- task_types — dynamic type registry per org
-- =========================================================================
create table kanban.task_types (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references kanban.organizations(id) on delete cascade,
  slug                  text not null,
  name                  text not null,
  icon                  text,
  color                 text,
  payload_schema        jsonb not null default '{"type":"object"}'::jsonb,
  default_capabilities  text[] not null default '{}',
  created_at            timestamptz not null default now(),
  unique (org_id, slug)
);

create index task_types_org_idx on kanban.task_types(org_id);

-- =========================================================================
-- boards
-- =========================================================================
create table kanban.boards (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references kanban.organizations(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create index boards_org_idx on kanban.boards(org_id);

-- =========================================================================
-- columns
-- =========================================================================
create table kanban.columns (
  id              uuid primary key default gen_random_uuid(),
  board_id        uuid not null references kanban.boards(id) on delete cascade,
  name            text not null,
  position        int  not null,
  sla_seconds     int,
  wip_limit       int,
  is_done_column  boolean not null default false,
  created_at      timestamptz not null default now()
);

create index columns_board_idx on kanban.columns(board_id, position);

-- =========================================================================
-- tasks — the core entity
-- =========================================================================
create table kanban.tasks (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references kanban.organizations(id) on delete cascade,
  board_id               uuid not null references kanban.boards(id) on delete cascade,
  column_id              uuid not null references kanban.columns(id),
  type                   text not null,
  title                  text not null,
  description            text,
  payload                jsonb not null default '{}'::jsonb,
  priority               int  not null default 1 check (priority between 0 and 3),
  required_capabilities  text[] not null default '{}',
  assignee_agent_id      uuid references kanban.agents(id) on delete set null,
  parent_task_id         uuid references kanban.tasks(id) on delete set null,
  created_by_agent_id    uuid references kanban.agents(id) on delete set null,
  created_by_user_id     uuid references kanban.users(id) on delete set null,
  position               int not null default 0,
  column_entered_at      timestamptz not null default now(),
  started_at             timestamptz,
  completed_at           timestamptz,
  due_at                 timestamptz,
  result                 jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (
    (created_by_agent_id is not null and created_by_user_id is null) or
    (created_by_agent_id is null and created_by_user_id is not null) or
    (created_by_agent_id is null and created_by_user_id is null)
  )
);

create index tasks_board_column_idx          on kanban.tasks(org_id, board_id, column_id, position);
create index tasks_assignee_idx              on kanban.tasks(assignee_agent_id);
create index tasks_parent_idx                on kanban.tasks(parent_task_id);
create index tasks_required_capabilities_idx on kanban.tasks using gin (required_capabilities);
create index tasks_type_idx                  on kanban.tasks(type);

-- agents.current_task_id fk — added after tasks exists
alter table kanban.agents
  add constraint agents_current_task_fkey
  foreign key (current_task_id) references kanban.tasks(id) on delete set null;

-- =========================================================================
-- task_dependencies — N-to-N block-on
-- =========================================================================
create table kanban.task_dependencies (
  task_id            uuid not null references kanban.tasks(id) on delete cascade,
  blocks_on_task_id  uuid not null references kanban.tasks(id) on delete cascade,
  created_at         timestamptz not null default now(),
  primary key (task_id, blocks_on_task_id),
  check (task_id <> blocks_on_task_id)
);

create index task_dependencies_blocks_on_idx on kanban.task_dependencies(blocks_on_task_id);

-- =========================================================================
-- task_events — append-only timeline
-- =========================================================================
create table kanban.task_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references kanban.organizations(id) on delete cascade,
  task_id         uuid not null references kanban.tasks(id) on delete cascade,
  actor_agent_id  uuid references kanban.agents(id) on delete set null,
  actor_user_id   uuid references kanban.users(id) on delete set null,
  kind            text not null check (kind in (
    'created','claimed','released','moved','progress',
    'commented','completed','blocked','assigned','dependency_added','dependency_removed'
  )),
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index task_events_task_idx       on kanban.task_events(task_id, created_at desc);
create index task_events_org_recent_idx on kanban.task_events(org_id, created_at desc);

-- =========================================================================
-- comments
-- =========================================================================
create table kanban.comments (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references kanban.organizations(id) on delete cascade,
  task_id          uuid not null references kanban.tasks(id) on delete cascade,
  author_agent_id  uuid references kanban.agents(id) on delete set null,
  author_user_id   uuid references kanban.users(id) on delete set null,
  body             text not null,
  created_at       timestamptz not null default now()
);

create index comments_task_idx on kanban.comments(task_id, created_at desc);

-- Expose the schema to the PostgREST API roles
grant usage on schema kanban to anon, authenticated, service_role;
grant all   on all tables    in schema kanban to service_role;
grant all   on all sequences in schema kanban to service_role;
grant all   on all functions in schema kanban to service_role;
alter default privileges in schema kanban grant all on tables    to service_role;
alter default privileges in schema kanban grant all on sequences to service_role;
alter default privileges in schema kanban grant all on functions to service_role;
