import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

function safeNext(raw: string | undefined): string {
  if (!raw) return "/divorcewithaplan/board/demo";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/divorcewithaplan/board/demo";
  return raw;
}

export default async function HomePage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const destination = safeNext(next);

  const user = await getCurrentUser();
  if (user) redirect(destination);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card/30 p-8 shadow-2xl backdrop-blur">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 animate-breathe rounded-full bg-emerald-400" />
            Agent Kanban
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Continue with Google to access the orchestration board.
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <form action="/api/auth/google" method="get" className="w-full">
          <input type="hidden" name="next" value={destination} />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg className="size-4" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.2 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.4 4.5 9.8 8.8 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5.1c-2.1 1.4-4.7 2.2-7.5 2.2-5.3 0-9.7-3.1-11.4-7.5l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6 5.1c-.4.4 6.5-4.7 6.5-14.8 0-1.2-.1-2.4-.4-3.5z"/>
            </svg>
            Sign in with Google
          </button>
        </form>

        <p className="text-[11px] text-muted-foreground">
          Only allow-listed Google accounts can sign in. Talk to your admin if
          you don&apos;t have access yet.
        </p>
      </div>
    </main>
  );
}
