"use client";

import { AlertTriangle, Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function TokenRevealModal({
  token,
  agentName,
  onClose,
  demo = false
}: {
  token: string | null;
  agentName: string;
  onClose: () => void;
  demo?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — user can still select + copy */
    }
  }

  return (
    <Dialog open={!!token} onOpenChange={(o) => !o && acknowledged && onClose()}>
      <DialogContent side="center" className="max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-400" />
            Copy this token now
          </DialogTitle>
          <DialogDescription>
            This is the only time <span className="font-medium">{agentName}</span>&apos;s token will be shown.
            Save it somewhere safe — you won&apos;t be able to retrieve it later.
          </DialogDescription>
        </DialogHeader>

        {demo && (
          <div className="rounded-md border border-amber-400/40 bg-amber-500/10 p-2.5 text-xs text-amber-200">
            Demo mode — Supabase isn&apos;t ready yet. This token will not actually
            authenticate to the MCP server until migrations are applied and this
            agent is persisted.
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
            <code className="flex-1 break-all font-mono text-xs">{token}</code>
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Usage: <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer {token?.slice(0, 6)}…{token?.slice(-4)}</code>
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="size-3.5 accent-foreground"
          />
          I&apos;ve saved this token securely.
        </label>

        <DialogFooter>
          <Button
            onClick={onClose}
            disabled={!acknowledged}
            className={cn(!acknowledged && "opacity-50")}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
