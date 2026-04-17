"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client — uses the anon key and is safe to ship to the browser.
 * Read-only via RLS. Writes go through Next.js route handlers (service role).
 * Operates on the `kanban` schema.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "The browser needs the anon key for reads + realtime; never expose the service-role key."
    );
  }
  return createBrowserClient(url, key, {
    db: { schema: "kanban" }
  });
}
