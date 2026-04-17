"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/types";

const roleColors: Record<string, string> = {
  devops:  "from-sky-400 to-sky-600",
  content: "from-emerald-400 to-emerald-600",
  seo:     "from-amber-400 to-amber-600",
  web:     "from-violet-400 to-violet-600",
  data:    "from-rose-400 to-rose-600"
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function lastSeenLabel(heartbeatAt: string | null, now: number): string {
  if (!heartbeatAt) return "never seen";
  const diff = Math.max(0, Math.floor((now - new Date(heartbeatAt).getTime()) / 1000));
  if (diff < 60)    return `last seen ${diff}s ago`;
  if (diff < 3600)  return `last seen ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `last seen ${Math.floor(diff / 3600)}h ago`;
  return `last seen ${Math.floor(diff / 86400)}d ago`;
}

function freshWithin(heartbeatAt: string | null, now: number, maxMs = 30_000): boolean {
  if (!heartbeatAt) return false;
  return now - new Date(heartbeatAt).getTime() < maxMs;
}

export function AgentAvatar({
  agent,
  size = "md",
  showStatus = true,
  className
}: {
  agent: Agent;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  className?: string;
}) {
  // Ticks every 15s so "last seen" tooltip stays honest and `fresh` flips
  // to gray shortly after heartbeats stop arriving.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const fresh = freshWithin(agent.heartbeat_at, now) && agent.status !== "offline";
  const gradient = roleColors[agent.role] ?? "from-zinc-500 to-zinc-700";

  const sizeClass =
    size === "sm" ? "size-6 text-[10px]" :
    size === "lg" ? "size-11 text-sm" :
    "size-8 text-xs";

  return (
    <div
      className={cn("relative inline-flex", className)}
      title={`${agent.name} · ${agent.role} · ${agent.status} · ${lastSeenLabel(agent.heartbeat_at, now)}`}
    >
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-2 ring-background",
          sizeClass,
          gradient,
          fresh && "animate-breathe",
          !fresh && "opacity-60 grayscale"
        )}
      >
        {initials(agent.name)}
      </div>
      {showStatus && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 inline-block h-2 w-2 rounded-full ring-2 ring-background",
            agent.status === "working" ? "bg-emerald-400" :
            agent.status === "idle"    ? "bg-sky-400" :
                                         "bg-zinc-500"
          )}
        />
      )}
    </div>
  );
}
