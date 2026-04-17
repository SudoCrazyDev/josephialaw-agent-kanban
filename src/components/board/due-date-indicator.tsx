"use client";

import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

function formatRelative(dueAt: string, now: number): { label: string; state: "far" | "soon" | "overdue" } {
  const diffMs = new Date(dueAt).getTime() - now;
  const absMs = Math.abs(diffMs);

  const units: Array<[number, string]> = [
    [86_400_000, "d"],
    [3_600_000, "h"],
    [60_000, "m"]
  ];
  let unit = "s";
  let value = Math.floor(absMs / 1000);
  for (const [ms, u] of units) {
    if (absMs >= ms) {
      unit = u;
      value = Math.floor(absMs / ms);
      break;
    }
  }

  const overdue = diffMs < 0;
  const state: "far" | "soon" | "overdue" =
    overdue ? "overdue" :
    diffMs < 24 * 3_600_000 ? "soon" :
    "far";

  return {
    label: overdue ? `overdue ${value}${unit}` : `due in ${value}${unit}`,
    state
  };
}

export function DueDateIndicator({ dueAt, className }: { dueAt: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000); // minute-ish precision
    return () => clearInterval(id);
  }, []);

  const { label, state } = formatRelative(dueAt, now);

  return (
    <span
      title={new Date(dueAt).toLocaleString()}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        state === "far"     && "bg-muted text-muted-foreground",
        state === "soon"    && "bg-amber-500/15 text-amber-400",
        state === "overdue" && "bg-rose-500/15 text-rose-400 animate-pulse",
        className
      )}
    >
      <CalendarClock className="size-3" />
      {label}
    </span>
  );
}
