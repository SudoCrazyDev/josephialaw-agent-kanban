"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session-core";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="flex items-center gap-2 rounded-full border border-border bg-card/40 p-0.5 pr-2.5 transition hover:bg-card"
        aria-label={`Signed in as ${user.email}`}
      >
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="size-7 rounded-full"
          />
        ) : (
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600 text-[10px] font-semibold text-white">
            {initials(user.name || user.email)}
          </span>
        )}
        <span className="hidden text-xs font-medium text-muted-foreground md:inline">
          {user.name || user.email}
        </span>
      </button>

      <div
        className={cn(
          "absolute right-0 top-[calc(100%+6px)] w-56 origin-top-right rounded-md border border-border bg-card shadow-lg transition",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="px-3 py-2">
          <div className="text-sm font-medium">{user.name || "—"}</div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        </div>
        <div className="border-t border-border p-1">
          <form action="/api/auth/sign-out" method="post">
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start text-rose-300 hover:text-rose-200">
              <LogOut />
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
