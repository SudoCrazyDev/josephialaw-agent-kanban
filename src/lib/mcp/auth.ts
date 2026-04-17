import { createHash, randomBytes } from "node:crypto";

import { createServiceRoleClient } from "@/lib/supabase/server";

export type AgentContext = {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  role: string;
  capabilities: string[];
};

export function hashToken(token: string): string {
  const pepper = process.env.MCP_TOKEN_PEPPER ?? "";
  return createHash("sha256").update(`${pepper}:${token}`).digest("hex");
}

/**
 * Generate a new bearer token. 32 random bytes → base64url → ~43 chars.
 * Returns the plaintext (show once, then discard), its hash (store), and the
 * last-4 for display purposes.
 */
export function generateAgentToken(): {
  plaintext: string;
  hash: string;
  last4: string;
} {
  const plaintext = randomBytes(32).toString("base64url");
  return {
    plaintext,
    hash: hashToken(plaintext),
    last4: plaintext.slice(-4)
  };
}

export async function authenticateAgent(token: string | null): Promise<AgentContext | null> {
  if (!token) return null;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id, org_id, name, slug, role, capabilities")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as AgentContext;
}
