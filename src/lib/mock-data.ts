/**
 * Mirrors supabase/seed.sql. Used until the Supabase project is wired up.
 * Replace `getMockBoardSnapshot` with a Supabase fetch in Phase 2.5.
 */

import type { BoardSnapshot } from "@/lib/types";

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
const secondsAgo = (s: number) => new Date(now.getTime() - s * 1000).toISOString();

export const mockSnapshot: BoardSnapshot = {
  org: {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "divorcewithaplan",
    name: "Divorce With A Plan",
    settings: { accent: "violet" }
  },

  board: {
    id: "20000000-0000-0000-0000-000000000001",
    org_id: "00000000-0000-0000-0000-000000000001",
    name: "Managed Agents — Default Board"
  },

  columns: [
    { id: "21000000-0000-0000-0000-000000000001", board_id: "20000000-0000-0000-0000-000000000001", name: "Backlog",     position: 0, sla_seconds: null, wip_limit: null, is_done_column: false },
    { id: "21000000-0000-0000-0000-000000000002", board_id: "20000000-0000-0000-0000-000000000001", name: "Ready",       position: 1, sla_seconds: 1800, wip_limit: null, is_done_column: false },
    { id: "21000000-0000-0000-0000-000000000003", board_id: "20000000-0000-0000-0000-000000000001", name: "In Progress", position: 2, sla_seconds: 3600, wip_limit: 5,    is_done_column: false },
    { id: "21000000-0000-0000-0000-000000000004", board_id: "20000000-0000-0000-0000-000000000001", name: "Review",      position: 3, sla_seconds: 1800, wip_limit: null, is_done_column: false },
    { id: "21000000-0000-0000-0000-000000000005", board_id: "20000000-0000-0000-0000-000000000001", name: "Blocked",     position: 4, sla_seconds: null, wip_limit: null, is_done_column: false },
    { id: "21000000-0000-0000-0000-000000000006", board_id: "20000000-0000-0000-0000-000000000001", name: "Done",        position: 5, sla_seconds: null, wip_limit: null, is_done_column: true }
  ],

  taskTypes: [
    { id: "10000000-0000-0000-0000-000000000001", org_id: "00000000-0000-0000-0000-000000000001", slug: "website.build",     name: "Website Build", icon: "layout",    color: "violet",  payload_schema: {}, default_capabilities: ["web.nextjs","web.tailwind"] },
    { id: "10000000-0000-0000-0000-000000000002", org_id: "00000000-0000-0000-0000-000000000001", slug: "content.blog-post", name: "Blog Post",     icon: "pen-tool",  color: "emerald", payload_schema: {}, default_capabilities: ["content.writing"] },
    { id: "10000000-0000-0000-0000-000000000003", org_id: "00000000-0000-0000-0000-000000000001", slug: "seo.audit",         name: "SEO Audit",     icon: "search",    color: "amber",   payload_schema: {}, default_capabilities: ["seo.onpage"] },
    { id: "10000000-0000-0000-0000-000000000004", org_id: "00000000-0000-0000-0000-000000000001", slug: "devops.deploy",     name: "DevOps Deploy", icon: "server",    color: "sky",     payload_schema: {}, default_capabilities: ["devops.docker","devops.ec2"] },
    { id: "10000000-0000-0000-0000-000000000005", org_id: "00000000-0000-0000-0000-000000000001", slug: "data.pipeline",     name: "Data Pipeline", icon: "database",  color: "rose",    payload_schema: {}, default_capabilities: ["data.etl"] }
  ],

  agents: [
    { id: "30000000-0000-0000-0000-000000000001", org_id: "00000000-0000-0000-0000-000000000001", name: "DevOps Agent 1",  slug: "devops-1",  role: "devops",  capabilities: ["devops.docker","devops.ec2","devops.aws","devops.ci"], model: "claude-opus-4-7",   status: "working", current_task_id: "40000000-0000-0000-0000-000000000001", heartbeat_at: secondsAgo(4) },
    { id: "30000000-0000-0000-0000-000000000002", org_id: "00000000-0000-0000-0000-000000000001", name: "Content Agent 1", slug: "content-1", role: "content", capabilities: ["content.writing","content.blog","content.social"],    model: "claude-sonnet-4-6", status: "working", current_task_id: "40000000-0000-0000-0000-000000000003", heartbeat_at: secondsAgo(9) },
    { id: "30000000-0000-0000-0000-000000000003", org_id: "00000000-0000-0000-0000-000000000001", name: "SEO Agent 1",     slug: "seo-1",     role: "seo",     capabilities: ["seo.onpage","seo.keywords","seo.technical"],           model: "claude-sonnet-4-6", status: "working", current_task_id: "40000000-0000-0000-0000-000000000004", heartbeat_at: secondsAgo(12) },
    { id: "30000000-0000-0000-0000-000000000004", org_id: "00000000-0000-0000-0000-000000000001", name: "Web Agent 1",     slug: "web-1",     role: "web",     capabilities: ["web.nextjs","web.tailwind","web.react"],               model: "claude-opus-4-7",   status: "idle",    current_task_id: null,                                   heartbeat_at: secondsAgo(18) },
    { id: "30000000-0000-0000-0000-000000000005", org_id: "00000000-0000-0000-0000-000000000001", name: "Data Agent 1",    slug: "data-1",    role: "data",    capabilities: ["data.etl","data.sql","data.python"],                   model: "claude-sonnet-4-6", status: "offline", current_task_id: null,                                   heartbeat_at: minutesAgo(5) }
  ],

  tasks: [
    {
      id: "40000000-0000-0000-0000-000000000001", org_id: "00000000-0000-0000-0000-000000000001", board_id: "20000000-0000-0000-0000-000000000001",
      column_id: "21000000-0000-0000-0000-000000000003", type: "devops.deploy",
      title: "Dockerize and deploy this kanban to EC2",
      description: "Build Dockerfile + docker-compose.yml. Drop nginx site into /etc/nginx/sites-available/ and run certbot. Deploy to kanban.divorcewithaplan.com.",
      payload: { repo: "github.com/josephialaw/agent-kanban", target: "ec2", domain: "kanban.divorcewithaplan.com", reverse_proxy: "nginx (host-level, existing)", tls: "certbot" },
      priority: 3, required_capabilities: ["devops.docker","devops.ec2"],
      assignee_agent_id: "30000000-0000-0000-0000-000000000001",
      parent_task_id: null, created_by_agent_id: null, created_by_user_id: null,
      position: 0,
      column_entered_at: minutesAgo(42), started_at: minutesAgo(42), completed_at: null,
      due_at: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      result: null,
      created_at: minutesAgo(60), updated_at: minutesAgo(3)
    },
    {
      id: "40000000-0000-0000-0000-000000000002", org_id: "00000000-0000-0000-0000-000000000001", board_id: "20000000-0000-0000-0000-000000000001",
      column_id: "21000000-0000-0000-0000-000000000001", type: "website.build",
      title: "Build marketing landing page",
      description: "Next.js + Tailwind. Hero, features, pricing, footer.",
      payload: { framework: "nextjs", pages: ["/","/pricing","/about"] },
      priority: 2, required_capabilities: ["web.nextjs","web.tailwind"],
      assignee_agent_id: null, parent_task_id: null, created_by_agent_id: null, created_by_user_id: null,
      position: 0,
      column_entered_at: minutesAgo(120), started_at: null, completed_at: null, due_at: null, result: null,
      created_at: minutesAgo(120), updated_at: minutesAgo(120)
    },
    {
      id: "40000000-0000-0000-0000-000000000003", org_id: "00000000-0000-0000-0000-000000000001", board_id: "20000000-0000-0000-0000-000000000001",
      column_id: "21000000-0000-0000-0000-000000000002", type: "content.blog-post",
      title: "Launch announcement blog post",
      description: "Announce the new agent orchestration product.",
      payload: { topic: "Announcing Agent Kanban", word_count: 800 },
      priority: 2, required_capabilities: ["content.writing"],
      assignee_agent_id: "30000000-0000-0000-0000-000000000002",
      parent_task_id: null, created_by_agent_id: null, created_by_user_id: null,
      position: 0,
      column_entered_at: minutesAgo(8), started_at: minutesAgo(8), completed_at: null, due_at: null, result: null,
      created_at: minutesAgo(30), updated_at: minutesAgo(8)
    },
    {
      id: "40000000-0000-0000-0000-000000000004", org_id: "00000000-0000-0000-0000-000000000001", board_id: "20000000-0000-0000-0000-000000000001",
      column_id: "21000000-0000-0000-0000-000000000004", type: "seo.audit",
      title: "Audit landing page SEO",
      description: "Run on-page SEO check against the launched landing page.",
      payload: { url: "https://divorcewithaplan.com", scope: "page" },
      priority: 1, required_capabilities: ["seo.onpage"],
      assignee_agent_id: "30000000-0000-0000-0000-000000000003",
      parent_task_id: null, created_by_agent_id: null, created_by_user_id: null,
      position: 0,
      column_entered_at: minutesAgo(20), started_at: minutesAgo(25), completed_at: null, due_at: null, result: null,
      created_at: minutesAgo(40), updated_at: minutesAgo(20)
    },
    {
      id: "40000000-0000-0000-0000-000000000005", org_id: "00000000-0000-0000-0000-000000000001", board_id: "20000000-0000-0000-0000-000000000001",
      column_id: "21000000-0000-0000-0000-000000000001", type: "data.pipeline",
      title: "Client intake → CRM pipeline",
      description: "Funnel intake form submissions into the CRM.",
      payload: { source: "typeform", destination: "hubspot", schedule: "realtime" },
      priority: 1, required_capabilities: ["data.etl"],
      assignee_agent_id: null, parent_task_id: null, created_by_agent_id: null, created_by_user_id: null,
      position: 1,
      column_entered_at: minutesAgo(200), started_at: null, completed_at: null, due_at: null, result: null,
      created_at: minutesAgo(200), updated_at: minutesAgo(200)
    },
    {
      id: "40000000-0000-0000-0000-000000000006", org_id: "00000000-0000-0000-0000-000000000001", board_id: "20000000-0000-0000-0000-000000000001",
      column_id: "21000000-0000-0000-0000-000000000006", type: "content.blog-post",
      title: "FAQ: What is a kanban for agents?",
      description: "Explainer post.",
      payload: { topic: "What is agent orchestration" },
      priority: 1, required_capabilities: ["content.writing"],
      assignee_agent_id: "30000000-0000-0000-0000-000000000002",
      parent_task_id: null, created_by_agent_id: null, created_by_user_id: null,
      position: 0,
      column_entered_at: minutesAgo(180), started_at: minutesAgo(240), completed_at: minutesAgo(180), due_at: null,
      result: { result: "published" },
      created_at: minutesAgo(300), updated_at: minutesAgo(180)
    },
    {
      id: "40000000-0000-0000-0000-000000000007", org_id: "00000000-0000-0000-0000-000000000001", board_id: "20000000-0000-0000-0000-000000000001",
      column_id: "21000000-0000-0000-0000-000000000001", type: "content.blog-post",
      title: "Write hero copy",
      description: "Short, punchy hero section copy for the landing page.",
      payload: { topic: "Landing hero", word_count: 120 },
      priority: 2, required_capabilities: ["content.writing"],
      assignee_agent_id: null,
      parent_task_id: "40000000-0000-0000-0000-000000000002",
      created_by_agent_id: null, created_by_user_id: null,
      position: 2,
      column_entered_at: minutesAgo(90), started_at: null, completed_at: null, due_at: null, result: null,
      created_at: minutesAgo(90), updated_at: minutesAgo(90)
    },
    {
      id: "40000000-0000-0000-0000-000000000008", org_id: "00000000-0000-0000-0000-000000000001", board_id: "20000000-0000-0000-0000-000000000001",
      column_id: "21000000-0000-0000-0000-000000000005", type: "devops.deploy",
      title: "Set up Cloudflare DNS for kanban subdomain",
      description: "Blocked on access to the Cloudflare account.",
      payload: { target: "dns", domain: "kanban.divorcewithaplan.com" },
      priority: 3, required_capabilities: ["devops.dns"],
      assignee_agent_id: null, parent_task_id: null, created_by_agent_id: null, created_by_user_id: null,
      position: 0,
      column_entered_at: minutesAgo(35), started_at: null, completed_at: null,
      due_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      result: null,
      created_at: minutesAgo(50), updated_at: minutesAgo(35)
    }
  ],

  dependencies: [
    { task_id: "40000000-0000-0000-0000-000000000004", blocks_on_task_id: "40000000-0000-0000-0000-000000000002" },
    { task_id: "40000000-0000-0000-0000-000000000001", blocks_on_task_id: "40000000-0000-0000-0000-000000000008" }
  ],

  events: [
    { id: "e1", org_id: "00000000-0000-0000-0000-000000000001", task_id: "40000000-0000-0000-0000-000000000001", actor_agent_id: "30000000-0000-0000-0000-000000000001", actor_user_id: null, kind: "claimed",   payload: {}, created_at: minutesAgo(42) },
    { id: "e2", org_id: "00000000-0000-0000-0000-000000000001", task_id: "40000000-0000-0000-0000-000000000001", actor_agent_id: "30000000-0000-0000-0000-000000000001", actor_user_id: null, kind: "progress",  payload: { message: "Sketched Dockerfile, moving to Caddy config next" }, created_at: minutesAgo(18) },
    { id: "e3", org_id: "00000000-0000-0000-0000-000000000001", task_id: "40000000-0000-0000-0000-000000000003", actor_agent_id: "30000000-0000-0000-0000-000000000002", actor_user_id: null, kind: "claimed",   payload: {}, created_at: minutesAgo(8) },
    { id: "e4", org_id: "00000000-0000-0000-0000-000000000001", task_id: "40000000-0000-0000-0000-000000000006", actor_agent_id: "30000000-0000-0000-0000-000000000002", actor_user_id: null, kind: "completed", payload: { result: "published" }, created_at: minutesAgo(180) },
    { id: "e5", org_id: "00000000-0000-0000-0000-000000000001", task_id: "40000000-0000-0000-0000-000000000008", actor_agent_id: null,                                    actor_user_id: null, kind: "blocked",   payload: { reason: "No Cloudflare API access yet" }, created_at: minutesAgo(35) },
    { id: "e6", org_id: "00000000-0000-0000-0000-000000000001", task_id: "40000000-0000-0000-0000-000000000004", actor_agent_id: "30000000-0000-0000-0000-000000000003", actor_user_id: null, kind: "moved",     payload: { from_column: "In Progress", to_column: "Review" }, created_at: minutesAgo(20) },
    { id: "e7", org_id: "00000000-0000-0000-0000-000000000001", task_id: "40000000-0000-0000-0000-000000000007", actor_agent_id: null,                                    actor_user_id: null, kind: "created",   payload: { parent_task_id: "40000000-0000-0000-0000-000000000002" }, created_at: minutesAgo(90) }
  ]
};

export function getMockBoardSnapshot(orgSlug: string, _boardId: string): BoardSnapshot | null {
  if (orgSlug !== mockSnapshot.org.slug) return null;
  return mockSnapshot;
}
