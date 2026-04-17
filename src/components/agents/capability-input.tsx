"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CapabilityInput({
  value,
  onChange,
  placeholder = "Type and press Enter…"
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const cleaned = raw.trim();
    if (!cleaned) return;
    if (value.includes(cleaned)) { setDraft(""); return; }
    onChange([...value, cleaned]);
    setDraft("");
  }

  function remove(cap: string) {
    onChange(value.filter((c) => c !== cap));
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-1.5")}>
      {value.map((c) => (
        <span
          key={c}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium"
        >
          {c}
          <button
            type="button"
            aria-label={`Remove ${c}`}
            onClick={() => remove(c)}
            className="rounded-full p-0.5 hover:bg-accent"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => add(draft)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="h-6 flex-1 border-0 bg-transparent p-1 text-xs shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
