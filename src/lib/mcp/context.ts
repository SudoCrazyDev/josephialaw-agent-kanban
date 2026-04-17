import { createServiceRoleClient } from "@/lib/supabase/server";
import type { AgentContext } from "@/lib/mcp/auth";

export type McpContext = {
  agent: AgentContext;
  /** Service-role Supabase client scoped to the kanban schema. */
  supabase: ReturnType<typeof createServiceRoleClient>;
};

export function createMcpContext(agent: AgentContext): McpContext {
  return {
    agent,
    supabase: createServiceRoleClient()
  };
}
