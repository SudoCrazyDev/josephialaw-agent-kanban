"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

function formatElapsed(seconds: number) {
  if (seconds < 60) return `${Math.max(0, Math.floor(seconds))}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM === 0 ? `${h}h` : `${h}h ${remM}m`;
}

type SlaState = "none" | "ok" | "warn" | "breach";

function slaState(elapsedS: number, slaSeconds: number | null): SlaState {
  if (slaSeconds == null) return "none";
  if (elapsedS < slaSeconds) return "ok";
  if (elapsedS < slaSeconds * 2) return "warn";
  return "breach";
}

export function ColumnTimer({
  enteredAt,
  slaSeconds,
  className
}: {
  enteredAt: string;
  slaSeconds: number | null;
  className?: string;
}) {
  const [elapsedMs, setElapsedMs] = useState(() => Date.now() - new Date(enteredAt).getTime());

  useEffect(() => {
    const start = new Date(enteredAt).getTime();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, [enteredAt]);

  const elapsedS = Math.max(0, Math.floor(elapsedMs / 1000));
  const state = slaState(elapsedS, slaSeconds);

  return (
    <span
      data-sla={state === "none" ? undefined : state}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        state === "ok"     && "bg-emerald-500/10 text-emerald-400",
        state === "warn"   && "bg-amber-500/15 text-amber-400",
        state === "breach" && "bg-rose-500/15 text-rose-400 animate-pulse",
        state === "none"   && "text-muted-foreground",
        className
      )}
    >
      {formatElapsed(elapsedS)}
    </span>
  );
}
