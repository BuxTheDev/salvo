"use client";
/** Upload, smart-map review, enrichment upload, file-kind badge (spec §5, §11). */
import { useRef, useState } from "react";
import Papa from "papaparse";
import { useSalvo } from "@/lib/store";
import { useNormalized, useReport } from "@/lib/derived";
import { FIELD_ORDER, SPEC } from "@/lib/engine/mapper";
import type { RawRow } from "@/lib/engine/types";

const KIND: Record<string, [string, string]> = {
  base: ["Ready to blast", "gain"],
  enrichment: ["Skip-trace / enrichment file", "warn"],
  incomplete: ["Missing required data", "loss"],
};

function parseCsv(file: File, onRows: (rows: RawRow[]) => void) {
  Papa.parse<RawRow>(file, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      const rows = res.data.filter((r) => Object.values(r).some((v) => v !== "" && v != null));
      onRows(rows);
    },
  });
}

export function SmartImport({ startOpen = false }: { startOpen?: boolean }) {
  const { mapping, headers, fileName, enrichName, setMap, loadFile, loadEnrich } = useSalvo();
  const report = useReport();
  const norm = useNormalized();
  const [showMapper, setShowMapper] = useState(startOpen);
  const fileRef = useRef<HTMLInputElement>(null);
  const enrichRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | undefined | null) => {
    if (!f) return;
    parseCsv(f, (rows) => {
      loadFile(rows, f.name);
      setShowMapper(true);
    });
  };
  const onEnrich = (f: File | undefined | null) => {
    if (!f) return;
    parseCsv(f, (rows) => loadEnrich(rows, f.name));
  };

  return (
    <div className="sv-import">
      <div className="sv-import-top">
        <div className="sv-src">
          <span className={`sv-kind ${KIND[report.kind][1]}`}>{KIND[report.kind][0]}</span>
          <span>
            {fileName ? <b>{fileName}</b> : "Sample list"} · {norm.length} rows ·{" "}
            {Object.keys(mapping).length}/{FIELD_ORDER.length} fields mapped
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="sv-link" onClick={() => setShowMapper((v) => !v)}>
            {showMapper ? "Hide mapping" : "Review mapping"}
          </button>
          <label className="sv-upload">
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
            <span onClick={() => fileRef.current?.click()}>{fileName ? "↻ Replace list" : "⬆ Upload list"}</span>
          </label>
        </div>
      </div>

      {report.missing.length > 0 && (
        <div className="sv-missing">
          ⚠ Missing required: {report.missing.map((f) => SPEC[f].label).join(", ")}.{" "}
          {report.kind === "enrichment"
            ? "Looks like a skip-trace list — upload a base list, then add this as enrichment below."
            : "Map it below or upload a complete list."}
        </div>
      )}

      {showMapper && (
        <div className="sv-map">
          <div className="sv-map-grid">
            {FIELD_ORDER.map((f) => (
              <label key={f} className={`sv-mf ${SPEC[f].req && !mapping[f] ? "req-miss" : ""}`}>
                <span className="sv-mf-l">
                  {SPEC[f].label}
                  {SPEC[f].req && <b className="req">*</b>}
                </span>
                <select value={mapping[f]?.header || ""} onChange={(e) => setMap(f, e.target.value || null)}>
                  <option value="">— none —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                {mapping[f] && (
                  <span className={`sv-how ${mapping[f].how}`}>
                    {mapping[f].how === "manual" ? "set" : mapping[f].how === "exact" ? "auto" : "guess"}
                  </span>
                )}
              </label>
            ))}
          </div>
          <label className="sv-enrich">
            <input ref={enrichRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => onEnrich(e.target.files?.[0])} />
            <button className="sv-link2" onClick={() => enrichRef.current?.click()}>+ Add skip-trace / phone list</button>
            {enrichName && (
              <span className="sv-enrich-n">
                enriching from <b>{enrichName}</b>
              </span>
            )}
          </label>
        </div>
      )}
    </div>
  );
}
