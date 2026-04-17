-- Enable realtime fan-out on kanban.* tables.
-- Supabase ships a publication named supabase_realtime that we add tables to.
-- The browser subscribes via the Supabase JS client.

alter publication supabase_realtime add table kanban.tasks;
alter publication supabase_realtime add table kanban.task_events;
alter publication supabase_realtime add table kanban.comments;
alter publication supabase_realtime add table kanban.agents;
alter publication supabase_realtime add table kanban.task_dependencies;
