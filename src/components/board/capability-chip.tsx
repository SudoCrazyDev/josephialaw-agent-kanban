import { cn } from "@/lib/utils";

export function CapabilityChip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/60 bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  );
}
