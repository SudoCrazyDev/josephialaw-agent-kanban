import {
  Database, FileText, Layout, PenTool, Search, Server, Workflow, type LucideIcon
} from "lucide-react";

import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  layout: Layout,
  "pen-tool": PenTool,
  search: Search,
  server: Server,
  database: Database,
  workflow: Workflow,
  default: FileText
};

const colorMap: Record<string, string> = {
  violet:  "text-violet-400 bg-violet-500/10",
  emerald: "text-emerald-400 bg-emerald-500/10",
  amber:   "text-amber-400 bg-amber-500/10",
  sky:     "text-sky-400 bg-sky-500/10",
  rose:    "text-rose-400 bg-rose-500/10",
  default: "text-muted-foreground bg-muted"
};

export function TaskTypeIcon({
  icon,
  color,
  className
}: {
  icon: string | null;
  color: string | null;
  className?: string;
}) {
  const Icon = iconMap[icon ?? "default"] ?? iconMap.default;
  const tone = colorMap[color ?? "default"] ?? colorMap.default;
  return (
    <span className={cn("inline-flex size-6 items-center justify-center rounded-md", tone, className)}>
      <Icon className="size-3.5" />
    </span>
  );
}

export const typeBarColor: Record<string, string> = {
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  rose: "bg-rose-500",
  default: "bg-muted-foreground"
};
