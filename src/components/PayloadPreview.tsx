"use client";

import { useState } from "react";
import { toGhlCsv } from "@/lib/engine/export";
import type { Offer, Target } from "@/lib/engine/types";
import type { RowResult } from "@/lib/engine/select";

export function PayloadPreview({
  readyRows,
  target,
  offer,
}: {
  readyRows: RowResult[];
  target: Target;
  offer: Offer;
}) {
  const [open, setOpen] = useState(false);
  if (readyRows.length === 0) return null;

  const preview = toGhlCsv(readyRows.slice(0, 5), target, offer);

  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium"
      >
        <span>GHL payload preview</span>
        <span className="text-ink-2">{open ? "hide" : "show"} · first 5 rows</span>
      </button>
      {open && (
        <pre className="max-h-64 overflow-auto bg-ink px-4 py-3 text-[11px] leading-relaxed text-white/80">
          <code>{preview}</code>
        </pre>
      )}
    </div>
  );
}
