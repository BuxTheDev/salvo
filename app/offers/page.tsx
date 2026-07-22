"use client";
/** The console: Target × Offer, settings, stats, results, blast (spec §11 — Salvo.jsx parity). */
import { useMemo, useState } from "react";
import { useSalvo } from "@/lib/store";
import { useScored, useStats } from "@/lib/derived";
import { isReachable } from "@/lib/engine/score";
import { usd } from "@/lib/engine/format";
import { buildExportRow, toCSV, OFFERS, TARGET_LABEL } from "@/lib/engine/export";
import { SmartImport } from "@/components/SmartImport";
import { ModeControls } from "@/components/ModeControls";
import { StatStrip } from "@/components/StatStrip";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ResultsTable } from "@/components/ResultsTable";
import { LOIPreview } from "@/components/LOIPreview";

function downloadText(text: string, name: string, type = "text/csv;charset=utf-8;") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function OffersPage() {
  const { target, offer, reachableOnly, sel, settings, note, setSel, setNote } = useSalvo();
  const scored = useScored();
  const stats = useStats(scored);
  const [showPayload, setShowPayload] = useState(false);
  const [showLoi, setShowLoi] = useState(false);

  const readyRows = useMemo(
    () => scored.filter((x) => x.ready && (!reachableOnly || isReachable(x))),
    [scored, reachableOnly],
  );
  const selRows = useMemo(() => scored.filter((x) => sel.has(x.r.address) && x.ready), [scored, sel]);
  const firstSel = selRows[0];

  const blastCsv = () => {
    const rows = selRows.map((x) => buildExportRow(x, target, offer, x.dup));
    if (!rows.length) return;
    downloadText(toCSV(rows), `salvo_${target}_${offer}_${rows.length}.csv`);
    setNote(
      `Exported ${rows.length}-row CSV — ${OFFERS[offer]} · ${TARGET_LABEL[target]}. Import to GHL, map columns to custom fields, fire the "Offer Ready" workflow.`,
    );
  };

  return (
    <div>
      <SmartImport />
      <ModeControls />
      <StatStrip stats={stats} />

      <div className="sv-body">
        <SettingsPanel />

        <main className="sv-list">
          <div className="sv-toolbar">
            <div>
              <button className="sv-btn ghost" onClick={() => setSel(readyRows.map((x) => x.r.address))}>Select all ready</button>
              <button className="sv-btn ghost" onClick={() => setSel([])}>Clear</button>
              <button className="sv-btn ghost" onClick={() => setShowPayload((v) => !v)} disabled={!sel.size}>
                {showPayload ? "Hide mapping" : "Preview mapping"}
              </button>
            </div>
            <div className="flex gap-2">
              <button className="sv-btn steel" disabled={!sel.size} onClick={() => setShowLoi(true)}>
                ⎙ Generate {selRows.length} LOI{selRows.length === 1 ? "" : "s"} → PDF
              </button>
              <button className="sv-btn primary" disabled={!sel.size} onClick={blastCsv}>
                ⬇ Blast {sel.size} → CSV
              </button>
            </div>
          </div>

          {note && <div className="sv-note">{note}</div>}

          <ResultsTable scored={scored} />

          {firstSel && (offer === "creative" || (offer === "both" && firstSel.creativeOK)) && (
            <div className="sv-pitch">
              <span className="sv-pitch-lbl">LOI hook · {firstSel.r.address}</span>
              Selling creatively nets {firstSel.r.owner_full || "the seller"} {usd(firstSel.u.diff)} more than a
              traditional sale — {usd(firstSel.u.net_crea)} vs {usd(firstSel.u.net_trad)} after {settings.sellingPct}% costs.
            </div>
          )}

          {showPayload && firstSel && (
            <div className="sv-payload">
              <div className="sv-payload-cap">
                Column map · {OFFERS[offer]} · exactly the merge tags this LOI needs, all populated
                {offer === "cash" ? " (cash omits creative fields)" : " · includes the cash-page fields"}
              </div>
              <pre>{JSON.stringify(buildExportRow(firstSel, target, offer, firstSel.dup), null, 2)}</pre>
            </div>
          )}
        </main>
      </div>

      {showLoi && selRows.length > 0 && (
        <LOIPreview rows={selRows} target={target} offer={offer} onClose={() => setShowLoi(false)} />
      )}
    </div>
  );
}
