"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { Offer } from "@/lib/engine/types";
import type { RowResult } from "@/lib/engine/select";
import { LoiDocument } from "./LoiDocument";

const PdfViewerInner = dynamic(() => import("./PdfViewerInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-ink-2">Rendering PDF…</div>
  ),
});

export function LOIPreview({
  row,
  offer,
  onClose,
}: {
  row: RowResult;
  offer: Offer;
  onClose: () => void;
}) {
  const [combineCash, setCombineCash] = useState(true);

  async function download() {
    const blob = await pdf(
      <LoiDocument property={row.property} uw={row.uw} offer={offer} combineCash={combineCash} />,
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Salvo-LOI-${row.property.address.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <div className="text-sm font-semibold">LOI Preview</div>
            <div className="text-xs text-ink-2">{row.property.address}</div>
          </div>
          <div className="flex items-center gap-3">
            {offer !== "cash" && (
              <label className="flex items-center gap-1.5 text-xs text-ink-2">
                <input
                  type="checkbox"
                  checked={combineCash}
                  onChange={(e) => setCombineCash(e.target.checked)}
                  className="accent-[var(--gold)]"
                />
                Include cash page
              </label>
            )}
            <button
              type="button"
              onClick={download}
              className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-white"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-line px-3 py-1.5 text-xs"
            >
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-canvas">
          <PdfViewerInner
            property={row.property}
            uw={row.uw}
            offer={offer}
            combineCash={combineCash}
          />
        </div>
      </div>
    </div>
  );
}
