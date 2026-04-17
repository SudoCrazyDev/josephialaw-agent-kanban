import { redirect } from "next/navigation";

import { GoogleSignInButton } from "./google-button";
import { getCurrentUser } from "@/lib/auth/session";

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

function safeNext(raw: string | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const safeRedirect = safeNext(next);

  const user = await getCurrentUser();
  if (user) redirect(safeRedirect);

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
            Continue with Google to access the board.
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <GoogleSignInButton next={safeRedirect} />

        <p className="text-[11px] text-muted-foreground">
          Only allow-listed emails / domains can sign in. Talk to your admin if
          you don&apos;t have access yet.
        </p>
      </div>
    </main>
  );
}
