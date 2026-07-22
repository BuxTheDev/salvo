"use client";
/** LOI preview modal — renders the selected rows as a react-pdf document (spec Phase 3). */
import dynamic from "next/dynamic";
import { loiFields } from "@/lib/engine/loi";
import { OFFERS, TARGET_LABEL } from "@/lib/engine/export";
import type { Offer, ScoredRow, Target } from "@/lib/engine/types";
import type { LOIEntry } from "./pdf/LOIDocument";

const LOIViewerInner = dynamic(() => import("./LOIViewerInner"), {
  ssr: false,
  loading: () => (
    <div className="sv-modal-head">
      <span className="sv-modal-title">Rendering LOI preview…</span>
    </div>
  ),
});

export function LOIPreview({ rows, target, offer, onClose }: {
  rows: ScoredRow[];
  target: Target;
  offer: Offer;
  onClose: () => void;
}) {
  const entries: LOIEntry[] = rows.map((x) => ({
    f: loiFields(x.r, x.u),
    creativeOK: x.creativeOK,
    cashOK: x.cashOK,
  }));
  const title = `${rows.length} LOI${rows.length === 1 ? "" : "s"} · ${OFFERS[offer]} · ${TARGET_LABEL[target]}`;
  const fileName = `salvo_lois_${target}_${offer}_${rows.length}.pdf`;

  return (
    <div className="sv-modal-back" onClick={onClose}>
      <div className="sv-modal" onClick={(e) => e.stopPropagation()}>
        <LOIViewerInner entries={entries} offer={offer} fileName={fileName} title={title} onClose={onClose} />
      </div>
    </div>
  );
}
