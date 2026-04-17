/**
 * MCP Streamable HTTP endpoint.
 *
 *   POST /api/mcp  → JSON-RPC 2.0 request in body → JSON-RPC response
 *                    Authorization: Bearer <per-agent-token> required for tools/call
 *                    (initialize / ping / tools/list are permitted unauthenticated
 *                    so clients can introspect before connecting as a specific agent).
 *   GET  /api/mcp  → server info (JSON, for manual inspection / health checks)
 *
 * Transport note: we implement the wire format directly rather than use the
 * SDK's Node-oriented transport (see src/lib/mcp/dispatch.ts for rationale).
 */

import { NextResponse } from "next/server";

import { authenticateAgent } from "@/lib/mcp/auth";
import { createMcpContext } from "@/lib/mcp/context";
import { dispatch } from "@/lib/mcp/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractBearer(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
}

export async function GET() {
  return NextResponse.json({
    server: "agent-kanban-mcp",
    transport: "streamable-http",
    endpoint: "/api/mcp",
    methods: ["initialize", "ping", "tools/list", "tools/call", "notifications/initialized"],
    auth: "Authorization: Bearer <per-agent-token> (required for tools/call)",
    docs: "/docs/04-mcp-server.md"
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } },
      { status: 400 }
    );
  }

  const method = (body as { method?: string })?.method ?? "";
  const needsAuth = method === "tools/call";

  let context = null;
  if (needsAuth) {
    const token = extractBearer(req);
    const agent = await authenticateAgent(token);
    if (!agent) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: (body as { id?: unknown })?.id ?? null,
          error: { code: -32000, message: "unauthorized" }
        },
        { status: 401 }
      );
    }
    context = createMcpContext(agent);
  }

  const response = await dispatch(body, context);
  if (response === null) {
    // Notification — no body, 204 per JSON-RPC conventions
    return new Response(null, { status: 204 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sessionId = req.headers.get("mcp-session-id");
  if (sessionId) headers["Mcp-Session-Id"] = sessionId; // echo back stateless session id

  return new Response(JSON.stringify(response), { status: 200, headers });
}
