-- Adds token_last4 so the agent list can display "****1a2b" without ever
-- revealing the full token. Populated when a token is generated/rotated.

alter table kanban.agents
  add column if not exists token_last4 text;

-- Expose it on the public view (rebuild with the extra column).
create or replace view kanban.agents_public as
  select id, org_id, name, slug, role, capabilities, model,
         status, current_task_id, heartbeat_at, token_last4, created_at
  from kanban.agents;

grant select on kanban.agents_public to anon, authenticated;
