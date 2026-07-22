"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { downloadText } from "@/lib/csv";
import { toGhlCsv } from "@/lib/engine/export";
import type { Offer, Target } from "@/lib/engine/types";
import type { RowResult } from "@/lib/engine/select";
import { BulkLoiDocument } from "./loi/LoiDocument";

const PDF_CAP = 100;

export function BlastBar({
  readyRows,
  target,
  offer,
}: {
  readyRows: RowResult[];
  target: Target;
  offer: Offer;
}) {
  const [busy, setBusy] = useState(false);
  const count = readyRows.length;

  function exportCsv() {
    const csv = toGhlCsv(readyRows, target, offer);
    downloadText(`salvo-${target}-${offer}-${count}.csv`, csv);
  }

  async function generatePdf() {
    if (count === 0) return;
    setBusy(true);
    try {
      const items = readyRows.slice(0, PDF_CAP).map((r) => ({ property: r.property, uw: r.uw }));
      const blob = await pdf(<BulkLoiDocument items={items} offer={offer} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salvo-lois-${offer}-${items.length}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-ink px-5 py-3 text-white">
      <div className="text-sm">
        <span className="tnum text-lg font-semibold text-gold">{count}</span> offers ready to fire
        {count > PDF_CAP && (
          <span className="ml-2 text-xs text-white/50">(PDF capped at {PDF_CAP})</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={generatePdf}
          disabled={count === 0 || busy}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-40"
        >
          {busy ? "Generating…" : "Generate PDF"}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={count === 0}
          className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-40"
        >
          Export GHL CSV
        </button>
      </div>
    </div>
  );
}
