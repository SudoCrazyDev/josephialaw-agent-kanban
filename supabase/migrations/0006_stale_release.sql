-- =========================================================================
-- Stale-agent auto-release
-- =========================================================================
-- When an agent stops heartbeating, any task it was holding should flow back
-- to the unclaimed pool so another agent can pick it up. This function is
-- idempotent and safe to run as often as every 30s. Invoke it from:
--   - /api/cron/release-stale (with CRON_SECRET)
--   - pg_cron (scheduled below, commented out — uncomment after confirming the
--     extension is enabled on your Supabase project)
-- =========================================================================

create or replace function kanban.release_stale_agents(
  stale_threshold interval default interval '60 seconds'
)
returns table (
  released_agents uuid[],
  released_tasks  uuid[]
)
language plpgsql
security definer
set search_path = kanban, public
as $$
declare
  r_agents uuid[];
  r_tasks  uuid[];
begin
  -- 1. Agents whose heartbeat is older than threshold and who still hold a task
  with stale as (
    select id as agent_id, org_id, current_task_id
      from kanban.agents
     where status <> 'offline'
       and heartbeat_at is not null
       and heartbeat_at < now() - stale_threshold
  ),
  -- 2. Release any tasks they held
  task_release as (
    update kanban.tasks t
       set assignee_agent_id = null
      from stale s
     where t.id = s.current_task_id
       and t.assignee_agent_id = s.agent_id
     returning t.id as task_id, t.org_id, s.agent_id
  ),
  -- 3. Write a task_events row per released task
  event_insert as (
    insert into kanban.task_events (org_id, task_id, actor_agent_id, kind, payload)
    select tr.org_id, tr.task_id, tr.agent_id, 'released',
           jsonb_build_object('reason', 'stale_heartbeat')
      from task_release tr
    returning 1
  ),
  -- 4. Flip agents to offline and clear their current task
  agent_flip as (
    update kanban.agents a
       set status = 'offline',
           current_task_id = null
      from stale s
     where a.id = s.agent_id
     returning a.id
  )
  select
    coalesce((select array_agg(id) from agent_flip), '{}'::uuid[]),
    coalesce((select array_agg(task_id) from task_release), '{}'::uuid[])
  into r_agents, r_tasks;

  released_agents := r_agents;
  released_tasks  := r_tasks;
  return next;
end;
$$;

grant execute on function kanban.release_stale_agents(interval) to service_role;

-- =========================================================================
-- Optional: schedule with pg_cron. Uncomment after enabling the extension.
-- =========================================================================
-- create extension if not exists pg_cron with schema extensions;
-- select cron.schedule(
--   'agent-kanban-release-stale',
--   '* * * * *',  -- every minute
--   $$select kanban.release_stale_agents(interval '60 seconds');$$
-- );
