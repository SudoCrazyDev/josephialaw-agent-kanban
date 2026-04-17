-- MVP RLS — no human auth yet.
-- Browser uses the anon key with read-only access (write paths go through
-- Next.js route handlers using the service role key, which bypasses RLS).
-- Tighten when Supabase Auth lands.

alter table kanban.organizations     enable row level security;
alter table kanban.users             enable row level security;
alter table kanban.org_members       enable row level security;
alter table kanban.agents            enable row level security;
alter table kanban.task_types        enable row level security;
alter table kanban.boards            enable row level security;
alter table kanban.columns           enable row level security;
alter table kanban.tasks             enable row level security;
alter table kanban.task_dependencies enable row level security;
alter table kanban.task_events       enable row level security;
alter table kanban.comments          enable row level security;

-- Read-any for anon (MVP). Never expose agents.token_hash to the browser —
-- that column must be selected out via API routes only (or the view below).
create policy anon_read_organizations on kanban.organizations     for select to anon using (true);
create policy anon_read_boards        on kanban.boards            for select to anon using (true);
create policy anon_read_columns       on kanban.columns           for select to anon using (true);
create policy anon_read_task_types    on kanban.task_types        for select to anon using (true);
create policy anon_read_tasks         on kanban.tasks             for select to anon using (true);
create policy anon_read_deps          on kanban.task_dependencies for select to anon using (true);
create policy anon_read_events        on kanban.task_events       for select to anon using (true);
create policy anon_read_comments      on kanban.comments          for select to anon using (true);

-- Expose agents via a view that strips token_hash
create or replace view kanban.agents_public as
  select id, org_id, name, slug, role, capabilities, model,
         status, current_task_id, heartbeat_at, created_at
  from kanban.agents;

grant select on kanban.agents_public to anon, authenticated;

-- Revoke direct anon/authenticated select on the base table (token_hash must never leak)
revoke select on kanban.agents from anon, authenticated;

-- Service role bypasses RLS, so the MCP server and our API routes can do anything.
