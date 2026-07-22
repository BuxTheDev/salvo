"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { DEMO_PROPERTIES } from "@/lib/demo-data";
import {
  autoMap,
  classifyMapping,
  FIELD_ORDER,
  normalizeWithMap,
} from "@/lib/engine/mapper";
import { CanonicalField, Mapping } from "@/lib/engine/types";

type CsvRow = Record<string, string | undefined>;

const LABELS: Partial<Record<CanonicalField, string>> = {
  address: "Property address",
  city: "City",
  state: "State",
  zip: "ZIP code",
  home_value: "Home value",
  loan_balance: "Loan balance",
  equity: "Estimated equity",
  monthly_rent: "Monthly rent",
  loan_payment: "Loan payment",
  asking: "Asking price",
  owner_full: "Owner full name",
  owner_first: "Owner first name",
  owner_last: "Owner last name",
  agent_name: "Agent name",
  agent_email: "Agent email",
  agent_phone: "Agent phone",
  owner_cell: "Owner cell",
  owner_email: "Owner email",
};

export function ImportConsole() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const classification = classifyMapping(mapping);

  function parseFile(file: File) {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const nextHeaders = meta.fields ?? [];
        setFilename(file.name);
        setRows(data);
        setHeaders(nextHeaders);
        setMapping(autoMap(nextHeaders));
      },
    });
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) parseFile(file);
  }

  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  function updateMapping(field: CanonicalField, header: string) {
    setMapping((current) => {
      const next = { ...current };
      if (!header) delete next[field];
      else next[field] = { header, method: "manual" };
      return next;
    });
  }

  function continueToOffers() {
    const properties = normalizeWithMap(rows, mapping);
    localStorage.setItem("salvo-properties", JSON.stringify(properties));
    localStorage.setItem("salvo-source", filename);
    router.push("/offers");
  }

  function useDemo() {
    localStorage.setItem("salvo-properties", JSON.stringify(DEMO_PROPERTIES));
    localStorage.setItem("salvo-source", "phoenix-propstream-demo.csv");
    router.push("/offers");
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">01 / Load the chamber</div>
          <h1 className="page-title">Bring the list. We&apos;ll find the signal.</h1>
          <p className="page-subtitle">Import any property CSV. Salvo maps, validates, and prepares every row for underwriting.</p>
        </div>
        <button className="btn" onClick={useDemo}><Sparkles size={14} /> Try demo data</button>
      </div>

      {!rows.length ? (
        <div className="import-layout">
          <div
            className={`dropzone panel ${dragging ? "dragging" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={dropFile}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={selectFile} />
            <div className="upload-icon"><UploadCloud size={24} /></div>
            <h2>Drop your property list here</h2>
            <p>PropStream, PropWire, BatchLeads, or any CSV</p>
            <button className="btn btn-dark" type="button">Choose a CSV</button>
            <div className="drop-meta"><span>CSV ONLY</span><span>CLIENT-SIDE PREVIEW</span><span>NO DATA SENT</span></div>
          </div>
          <div className="import-side">
            <div className="panel expectation-card">
              <div className="panel-head">
                <h3 className="panel-title">What Salvo looks for</h3>
                <div className="panel-kicker">Two fields are required to run</div>
              </div>
              <div className="requirements">
                <div><Check size={14} /><span><strong>Property address</strong><small>Required</small></span></div>
                <div><Check size={14} /><span><strong>Home value</strong><small>Required</small></span></div>
                <div className="optional"><Check size={14} /><span><strong>Debt + rent</strong><small>Creative underwriting</small></span></div>
                <div className="optional"><Check size={14} /><span><strong>Agent or owner contact</strong><small>For handoff</small></span></div>
              </div>
            </div>
            <div className="privacy-note">
              <span className="mono">SMART MAP</span>
              <p>Headers are matched in two passes, then stay fully editable before import.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="file-summary panel">
            <div className="file-icon"><FileSpreadsheet size={21} /></div>
            <div>
              <strong>{filename}</strong>
              <p>{rows.length.toLocaleString()} properties · {headers.length} columns detected</p>
            </div>
            <span className={`badge ${classification.kind === "base" ? "badge-green" : classification.kind === "enrichment" ? "badge-blue" : "badge-red"}`}>
              {classification.kind === "base" ? <Check size={10} /> : <AlertTriangle size={10} />}
              {classification.kind}
            </span>
            <button className="btn" onClick={() => { setRows([]); setMapping({}); }}>
              <RefreshCw size={13} /> Replace
            </button>
          </div>

          <section className="panel mapping-panel">
            <div className="panel-head mapping-heading">
              <div>
                <h3 className="panel-title">Review mapping</h3>
                <div className="panel-kicker">{Object.keys(mapping).length} of {FIELD_ORDER.length} fields mapped</div>
              </div>
              <div className="mapping-legend"><span><i className="exact" /> exact</span><span><i className="fuzzy" /> guess</span><span><i className="manual" /> set</span></div>
            </div>
            {classification.missing.length > 0 && (
              <div className="mapping-warning"><AlertTriangle size={15} /> Map required field{classification.missing.length > 1 ? "s" : ""}: {classification.missing.map((field) => LABELS[field]).join(", ")}</div>
            )}
            <div className="mapping-grid">
              {FIELD_ORDER.map((field) => {
                const item = mapping[field];
                const required = field === "address" || field === "home_value";
                return (
                  <label className="mapping-row" key={field}>
                    <span>{LABELS[field]} {required && <b>*</b>}</span>
                    <select value={item?.header ?? ""} onChange={(event) => updateMapping(field, event.target.value)}>
                      <option value="">— none —</option>
                      {headers.map((header) => <option value={header} key={header}>{header}</option>)}
                    </select>
                    <span className={`map-method ${item?.method ?? "none"}`}>{item?.method === "fuzzy" ? "guess" : item?.method ?? "—"}</span>
                  </label>
                );
              })}
            </div>
            <div className="mapping-footer">
              <div><strong>{rows.length.toLocaleString()}</strong> rows ready to normalize</div>
              <button className="btn btn-primary" disabled={classification.kind !== "base"} onClick={continueToOffers}>
                Underwrite list <ArrowRight size={14} />
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
