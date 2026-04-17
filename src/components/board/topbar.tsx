import { Filter, Plus, Search, Users } from "lucide-react";
import Link from "next/link";

import { UserMenu } from "@/components/auth/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth/session-core";
import type { BoardSnapshot } from "@/lib/types";

export function Topbar({
  snapshot,
  onNewTask,
  user
}: {
  snapshot: BoardSnapshot;
  onNewTask?: () => void;
  user?: SessionUser | null;
}) {
  const chips = ["All", "Blocked", "High priority", ...Array.from(new Set(snapshot.agents.map((a) => a.role)))];

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-background/60 px-5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="size-2 animate-breathe rounded-full bg-emerald-400" />
          <span className="text-sm font-semibold tracking-tight">{snapshot.org.name}</span>
        </div>
        <span className="text-muted-foreground">/</span>
        <span className="truncate text-sm text-muted-foreground">{snapshot.board.name}</span>
      </div>

      <div className="flex items-center gap-1.5">
        {chips.slice(0, 6).map((c, i) => (
          <Badge
            key={c}
            variant={i === 0 ? "default" : "outline"}
            className="cursor-pointer select-none capitalize"
          >
            {c}
          </Badge>
        ))}
        <Button variant="ghost" size="icon" className="ml-1" aria-label="More filters">
          <Filter />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${snapshot.org.slug}/agents`}>
            <Users />
            <span className="hidden md:inline">Agents</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm">
          <Search />
          <span className="hidden md:inline">Search</span>
        </Button>
        <Button size="sm" onClick={onNewTask}>
          <Plus />
          <span>New task</span>
        </Button>
        <UserMenu user={user ?? null} />
      </div>
    </header>
  );
}
