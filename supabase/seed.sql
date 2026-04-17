-- Demo data for the "divorcewithaplan" org.
-- Safe to re-run: deletes its own rows first.

begin;

-- Purge prior seed (scoped to the one org slug we seed)
delete from kanban.organizations where slug = 'divorcewithaplan';

-- =========================================================================
-- Organization
-- =========================================================================
insert into kanban.organizations (id, slug, name, settings) values
  ('00000000-0000-0000-0000-000000000001',
   'divorcewithaplan',
   'Divorce With A Plan',
   jsonb_build_object('accent', 'violet'));

-- =========================================================================
-- Task types (dynamic — add more at runtime via UI)
-- =========================================================================
insert into kanban.task_types (id, org_id, slug, name, icon, color, payload_schema, default_capabilities) values
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'website.build', 'Website Build', 'layout', 'violet',
   jsonb_build_object(
     'type','object',
     'properties', jsonb_build_object(
       'repo', jsonb_build_object('type','string'),
       'framework', jsonb_build_object('type','string'),
       'pages', jsonb_build_object('type','array','items', jsonb_build_object('type','string'))
     )
   ),
   array['web.nextjs','web.tailwind']),

  ('10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'content.blog-post', 'Blog Post', 'pen-tool', 'emerald',
   jsonb_build_object(
     'type','object',
     'properties', jsonb_build_object(
       'topic', jsonb_build_object('type','string'),
       'word_count', jsonb_build_object('type','integer','minimum',300),
       'tone', jsonb_build_object('type','string')
     ),
     'required', jsonb_build_array('topic')
   ),
   array['content.writing']),

  ('10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'seo.audit', 'SEO Audit', 'search', 'amber',
   jsonb_build_object(
     'type','object',
     'properties', jsonb_build_object(
       'url', jsonb_build_object('type','string','format','uri'),
       'scope', jsonb_build_object('type','string','enum', jsonb_build_array('page','site'))
     ),
     'required', jsonb_build_array('url')
   ),
   array['seo.onpage']),

  ('10000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'devops.deploy', 'DevOps Deploy', 'server', 'sky',
   jsonb_build_object(
     'type','object',
     'properties', jsonb_build_object(
       'repo', jsonb_build_object('type','string'),
       'target', jsonb_build_object('type','string'),
       'domain', jsonb_build_object('type','string'),
       'compose_services', jsonb_build_object('type','array','items', jsonb_build_object('type','string'))
     )
   ),
   array['devops.docker','devops.ec2']),

  ('10000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000001',
   'data.pipeline', 'Data Pipeline', 'database', 'rose',
   jsonb_build_object(
     'type','object',
     'properties', jsonb_build_object(
       'source', jsonb_build_object('type','string'),
       'destination', jsonb_build_object('type','string'),
       'schedule', jsonb_build_object('type','string')
     )
   ),
   array['data.etl']);

-- =========================================================================
-- Board + columns
-- =========================================================================
insert into kanban.boards (id, org_id, name) values
  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Managed Agents — Default Board');

insert into kanban.columns (id, board_id, name, position, sla_seconds, wip_limit, is_done_column) values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Backlog',     0, null,  null, false),
  ('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Ready',       1, 1800,  null, false),
  ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'In Progress', 2, 3600,  5,    false),
  ('21000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Review',      3, 1800,  null, false),
  ('21000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'Blocked',     4, null,  null, false),
  ('21000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'Done',        5, null,  null, true);

-- =========================================================================
-- Agents — demo roster (token_hash left null; generate via UI in Phase 7)
-- =========================================================================
insert into kanban.agents (id, org_id, name, slug, role, capabilities, model, status, heartbeat_at) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'DevOps Agent 1', 'devops-1', 'devops',
   array['devops.docker','devops.ec2','devops.aws','devops.ci'], 'claude-opus-4-7', 'idle', now()),

  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Content Agent 1', 'content-1', 'content',
   array['content.writing','content.blog','content.social'], 'claude-sonnet-4-6', 'idle', now()),

  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'SEO Agent 1', 'seo-1', 'seo',
   array['seo.onpage','seo.keywords','seo.technical'], 'claude-sonnet-4-6', 'idle', now()),

  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Web Agent 1', 'web-1', 'web',
   array['web.nextjs','web.tailwind','web.react'], 'claude-opus-4-7', 'idle', now()),

  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Data Agent 1', 'data-1', 'data',
   array['data.etl','data.sql','data.python'], 'claude-sonnet-4-6', 'offline', now() - interval '5 minutes');

-- =========================================================================
-- Demo tasks
-- =========================================================================
insert into kanban.tasks (id, org_id, board_id, column_id, type, title, description, payload, priority, required_capabilities, assignee_agent_id, position) values

  ('40000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '21000000-0000-0000-0000-000000000003',
   'devops.deploy',
   'Dockerize and deploy this kanban to EC2',
   'Build Dockerfile + docker-compose.yml. Drop nginx site into /etc/nginx/sites-available/ and run certbot. Deploy to kanban.divorcewithaplan.com.',
   jsonb_build_object(
     'repo','github.com/josephialaw/agent-kanban',
     'target','ec2',
     'domain','kanban.divorcewithaplan.com',
     'reverse_proxy','nginx (host-level, existing)',
     'tls','certbot (host-level, existing)',
     'compose_services', jsonb_build_array('web')
   ),
   3,
   array['devops.docker','devops.ec2'],
   '30000000-0000-0000-0000-000000000001',
   0),

  ('40000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '21000000-0000-0000-0000-000000000001',
   'website.build',
   'Build marketing landing page',
   'Next.js + Tailwind. Hero, features, pricing, footer.',
   jsonb_build_object('repo','github.com/josephialaw/marketing','framework','nextjs','pages', jsonb_build_array('/','/pricing','/about')),
   2,
   array['web.nextjs','web.tailwind'],
   null, 0),

  ('40000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '21000000-0000-0000-0000-000000000002',
   'content.blog-post',
   'Launch announcement blog post',
   'Announce the new agent orchestration product.',
   jsonb_build_object('topic','Announcing Agent Kanban','word_count',800,'tone','confident'),
   2,
   array['content.writing'],
   '30000000-0000-0000-0000-000000000002', 0),

  ('40000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '21000000-0000-0000-0000-000000000004',
   'seo.audit',
   'Audit landing page SEO',
   'Run on-page SEO check against the launched landing page.',
   jsonb_build_object('url','https://divorcewithaplan.com','scope','page'),
   1,
   array['seo.onpage'],
   '30000000-0000-0000-0000-000000000003', 0),

  ('40000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '21000000-0000-0000-0000-000000000001',
   'data.pipeline',
   'Client intake → CRM pipeline',
   'Funnel intake form submissions into the CRM.',
   jsonb_build_object('source','typeform','destination','hubspot','schedule','realtime'),
   1,
   array['data.etl'],
   null, 1),

  ('40000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '21000000-0000-0000-0000-000000000006',
   'content.blog-post',
   'FAQ: What is a kanban for agents?',
   'Explainer post.',
   jsonb_build_object('topic','What is agent orchestration','word_count',600,'tone','educational'),
   1,
   array['content.writing'],
   '30000000-0000-0000-0000-000000000002', 0),

  ('40000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '21000000-0000-0000-0000-000000000001',
   'content.blog-post',
   'Write hero copy',
   'Short, punchy hero section copy for the landing page.',
   jsonb_build_object('topic','Landing hero','word_count',120,'tone','bold'),
   2,
   array['content.writing'],
   null, 2),

  ('40000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   '21000000-0000-0000-0000-000000000005',
   'devops.deploy',
   'Set up Cloudflare DNS for kanban subdomain',
   'Blocked on access to the Cloudflare account.',
   jsonb_build_object('target','dns','domain','kanban.divorcewithaplan.com'),
   3,
   array['devops.dns'],
   null, 0);

-- Link subtasks to parent
update kanban.tasks
   set parent_task_id = '40000000-0000-0000-0000-000000000002'
 where id = '40000000-0000-0000-0000-000000000007';

-- Dependency: SEO audit blocks on website build, and the Docker bootstrap blocks on DNS
insert into kanban.task_dependencies (task_id, blocks_on_task_id) values
  ('40000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000008');

-- A few task_events so the activity sidebar has content on first paint
insert into kanban.task_events (org_id, task_id, actor_agent_id, kind, payload) values
  ('00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001', 'claimed', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001', 'progress',
   jsonb_build_object('message','Sketched Dockerfile, moving to Caddy config next')),
  ('00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000002', 'claimed', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000006',
   '30000000-0000-0000-0000-000000000002', 'completed',
   jsonb_build_object('result','published')),
  ('00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000008',
   null, 'blocked', jsonb_build_object('reason','No Cloudflare API access yet'));

commit;
