"use client";
/** Browser-only react-pdf viewer + download; loaded via next/dynamic (no SSR). */
import { useState } from "react";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import { LOIDocument, type LOIEntry } from "./pdf/LOIDocument";
import type { Offer } from "@/lib/engine/types";

export default function LOIViewerInner({ entries, offer, fileName, title, onClose }: {
  entries: LOIEntry[];
  offer: Offer;
  fileName: string;
  title: string;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [includeCashPage, setIncludeCashPage] = useState(true);
  const doc = <LOIDocument entries={entries} offer={offer} includeCashPage={includeCashPage} />;

  const downloadPdf = async () => {
    setBusy(true);
    try {
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sv-modal-head">
        <span className="sv-modal-title">{title}</span>
        <div className="sv-modal-actions">
          {offer === "creative" && (
            <label className="sv-toggle">
              <input type="checkbox" checked={includeCashPage} onChange={(e) => setIncludeCashPage(e.target.checked)} />
              Append cash page
            </label>
          )}
          <button className="sv-btn primary" onClick={downloadPdf} disabled={busy}>
            {busy ? "Rendering…" : "⬇ Download PDF"}
          </button>
          <button className="sv-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
      </div>
      <div className="sv-modal-body">
        <PDFViewer width="100%" height="100%" showToolbar>
          {doc}
        </PDFViewer>
      </div>
    </>
  );
}
