import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-24">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-breathe rounded-full bg-emerald-400" />
          Phase 0 · scaffold
        </div>

        <h1 className="text-5xl font-semibold tracking-tight">Agent Kanban</h1>
        <p className="text-lg text-muted-foreground">
          Orchestration board for Claude Managed Agents. Multi-tenant, realtime, dynamic task types.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/divorcewithaplan/board/demo"
            className="inline-flex items-center rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Open demo board →
          </Link>
          <Link
            href="/api/mcp"
            className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-accent"
          >
            MCP status
          </Link>
        </div>

        <div className="pt-8 text-sm text-muted-foreground">
          <p>See <code className="rounded bg-card px-1.5 py-0.5 text-xs">docs/</code> for the full plan. Phase 1 adds the schema; Phase 2 brings the board to life.</p>
        </div>
      </div>
    </main>
  );
}
