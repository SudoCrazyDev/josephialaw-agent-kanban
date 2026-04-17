import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS. Server-only.
 * Every caller MUST enforce org_id scoping themselves.
 * Operates on the `kanban` schema.
 *
 * Return type inferred — regenerate with `supabase gen types` once migrations
 * are applied for stricter typing.
 */
export function createServiceRoleClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_KEY env vars");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "kanban" }
  });
}
