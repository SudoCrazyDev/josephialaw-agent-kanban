-- =========================================================================
-- updated_at maintenance
-- =========================================================================
create or replace function kanban.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on kanban.tasks
  for each row execute function kanban.tg_set_updated_at();

-- =========================================================================
-- column change → update column_entered_at + emit task_events.moved
-- =========================================================================
create or replace function kanban.tg_tasks_column_change()
returns trigger language plpgsql as $$
begin
  if new.column_id is distinct from old.column_id then
    new.column_entered_at := now();
    if new.started_at is null then
      new.started_at := now();
    end if;

    insert into kanban.task_events (org_id, task_id, actor_agent_id, actor_user_id, kind, payload)
    values (
      new.org_id, new.id,
      nullif(current_setting('app.actor_agent_id', true), '')::uuid,
      nullif(current_setting('app.actor_user_id', true), '')::uuid,
      'moved',
      jsonb_build_object('from_column', old.column_id, 'to_column', new.column_id)
    );
  end if;
  return new;
end;
$$;

create trigger tasks_column_change
  before update of column_id on kanban.tasks
  for each row execute function kanban.tg_tasks_column_change();

-- =========================================================================
-- dependency cycle guard
-- =========================================================================
create or replace function kanban.tg_deps_no_cycle()
returns trigger language plpgsql as $$
declare
  exists_cycle boolean;
begin
  with recursive reach(t) as (
    select new.blocks_on_task_id
    union
    select d.blocks_on_task_id
      from kanban.task_dependencies d join reach r on d.task_id = r.t
  )
  select exists(select 1 from reach where t = new.task_id) into exists_cycle;

  if exists_cycle then
    raise exception 'task_dependencies: cycle detected (task % -> blocks_on %)', new.task_id, new.blocks_on_task_id;
  end if;
  return new;
end;
$$;

create trigger task_dependencies_no_cycle
  before insert on kanban.task_dependencies
  for each row execute function kanban.tg_deps_no_cycle();

-- =========================================================================
-- validate tasks.payload against task_types.payload_schema
-- Uses extensions.jsonb_matches_schema from pg_jsonschema.
-- =========================================================================
create or replace function kanban.tg_tasks_validate_payload()
returns trigger language plpgsql as $$
declare
  schema jsonb;
begin
  select payload_schema into schema
    from kanban.task_types
   where org_id = new.org_id and slug = new.type;

  if schema is null then
    raise exception 'unknown task_type "%" for org %', new.type, new.org_id;
  end if;

  if not extensions.jsonb_matches_schema(schema, new.payload) then
    raise exception 'kanban.tasks.payload does not match schema for type %', new.type;
  end if;

  return new;
end;
$$;

create trigger tasks_validate_payload
  before insert or update of payload, type on kanban.tasks
  for each row execute function kanban.tg_tasks_validate_payload();
