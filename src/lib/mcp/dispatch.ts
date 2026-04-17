/**
 * JSON-RPC 2.0 dispatcher for MCP Streamable HTTP.
 *
 * We intentionally implement the wire format directly rather than use
 * @modelcontextprotocol/sdk's StreamableHTTPServerTransport — the SDK transport
 * is built around Node http (req, res) and Next.js route handlers speak Web
 * standard Request/Response. The JSON-RPC shape below matches the MCP spec
 * (initialize, tools/list, tools/call, ping, notifications/initialized).
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { tools } from "@/lib/mcp/tools";
import type { McpContext } from "@/lib/mcp/context";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "agent-kanban-mcp", version: "0.1.0" };

const RpcRequest = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).nullable().optional(),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional()
});

export type RpcRequest = z.infer<typeof RpcRequest>;

type RpcResult = unknown;

type RpcErrorShape = { code: number; message: string; data?: unknown };

// -------------------------------------------------------------------------
// Response builders
// -------------------------------------------------------------------------

function result(id: RpcRequest["id"], value: RpcResult) {
  return { jsonrpc: "2.0" as const, id: id ?? null, result: value };
}

function error(id: RpcRequest["id"], err: RpcErrorShape) {
  return { jsonrpc: "2.0" as const, id: id ?? null, error: err };
}

// -------------------------------------------------------------------------
// Method handlers
// -------------------------------------------------------------------------

function handleInitialize(req: RpcRequest) {
  return result(req.id, {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: { tools: { listChanged: false } },
    serverInfo: SERVER_INFO,
    instructions:
      "Agent Kanban MCP server. Every tool runs as the authenticated agent and is scoped to its org. Use list_available_tasks to find work, claim_task to take it, log_progress to stream updates, and complete_task when done."
  });
}

function handleToolsList(req: RpcRequest) {
  const list = Object.entries(tools).map(([name, def]) => ({
    name,
    description: def.description,
    inputSchema: zodToJsonSchema(def.inputSchema, {
      target: "jsonSchema7",
      $refStrategy: "none"
    })
  }));
  return result(req.id, { tools: list });
}

async function handleToolsCall(req: RpcRequest, ctx: McpContext) {
  const params = req.params ?? {};
  const name = typeof params.name === "string" ? params.name : "";
  const args = (params.arguments ?? {}) as Record<string, unknown>;

  const tool = tools[name];
  if (!tool) {
    return error(req.id, { code: -32602, message: `unknown tool: ${name}` });
  }

  const parsed = tool.inputSchema.safeParse(args);
  if (!parsed.success) {
    return error(req.id, {
      code: -32602,
      message: "invalid arguments",
      data: parsed.error.issues
    });
  }

  try {
    const out = await tool.handler(parsed.data, ctx);
    return result(req.id, {
      content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }],
      isError: false
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return result(req.id, {
      content: [{ type: "text" as const, text: message }],
      isError: true
    });
  }
}

// -------------------------------------------------------------------------
// Entry point
// -------------------------------------------------------------------------

export async function dispatch(raw: unknown, ctx: McpContext | null) {
  const parsed = RpcRequest.safeParse(raw);
  if (!parsed.success) {
    return error(null, {
      code: -32700,
      message: "parse error",
      data: parsed.error.issues
    });
  }
  const req = parsed.data;

  // Notifications (no id) — no response per JSON-RPC spec.
  if (req.id == null) {
    return null;
  }

  switch (req.method) {
    case "initialize":
      return handleInitialize(req);

    case "ping":
      return result(req.id, {});

    case "tools/list":
      return handleToolsList(req);

    case "tools/call": {
      if (!ctx) {
        return error(req.id, { code: -32000, message: "authenticated context required" });
      }
      return handleToolsCall(req, ctx);
    }

    default:
      return error(req.id, { code: -32601, message: `method not found: ${req.method}` });
  }
}
