import { Flame, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/types";

const labels: Record<Priority, string> = { 0: "Low", 1: "Normal", 2: "High", 3: "Urgent" };

const styles: Record<Priority, string> = {
  0: "text-muted-foreground",
  1: "text-sky-400",
  2: "text-amber-400",
  3: "text-rose-400"
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const Icon = priority >= 2 ? Flame : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide", styles[priority])}>
      <Icon className="size-3" />
      {labels[priority]}
    </span>
  );
}
