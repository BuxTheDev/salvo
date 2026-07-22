"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseCsvFile } from "@/lib/csv";
import {
  autoMap,
  classify,
  type Classification,
  type FieldMapping,
} from "@/lib/engine/mapper";
import { enrich, normalizeWithMap, type Row } from "@/lib/engine/normalize";
import type { FieldKey } from "@/lib/engine/types";
import { useStore } from "@/lib/store";
import { MappingGrid } from "./MappingGrid";

const KIND_BADGE: Record<Classification["kind"], string> = {
  base: "bg-gain/10 text-gain border-gain/30",
  enrichment: "bg-steel/10 text-steel border-steel/30",
  incomplete: "bg-loss/10 text-loss border-loss/30",
};

export function SmartImport() {
  const router = useRouter();
  const { setProperties } = useStore();

  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<FieldMapping | null>(null);
  const [enrichRows, setEnrichRows] = useState<Row[] | null>(null);
  const [enrichName, setEnrichName] = useState("");
  const [busy, setBusy] = useState(false);

  const cls = mapping ? classify(mapping) : null;

  async function loadSample() {
    setBusy(true);
    try {
      const res = await fetch("/sample-propstream.csv");
      const text = await res.text();
      const file = new File([text], "sample-propstream.csv", { type: "text/csv" });
      await onFile(file);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const parsed = await parseCsvFile(file);
      setFilename(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(autoMap(parsed.headers));
      setEnrichRows(null);
      setEnrichName("");
    } finally {
      setBusy(false);
    }
  }

  async function onEnrichFile(file: File | null) {
    if (!file) return;
    const parsed = await parseCsvFile(file);
    setEnrichRows(parsed.rows);
    setEnrichName(file.name);
  }

  function updateMap(field: FieldKey, header: string | null) {
    if (!mapping) return;
    setMapping({
      map: { ...mapping.map, [field]: header },
      source: { ...mapping.source, [field]: header ? "set" : "none" },
    });
  }

  function loadIntoConsole() {
    if (!mapping || !cls) return;
    let props = normalizeWithMap(rows, mapping);
    if (enrichRows) {
      const enrichProps = normalizeWithMap(enrichRows, autoMap(Object.keys(enrichRows[0] ?? {})));
      props = enrich(props, enrichProps);
    }
    setProperties(props, { filename, rowCount: props.length, kind: cls.kind }, mapping);
    router.push("/offers");
  }

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <h2 className="mb-1 text-lg font-semibold">Smart Import</h2>
        <p className="mb-4 text-sm text-ink-2">
          Drop any property list — PropStream, PropWire, BatchLeads, or a novel CSV. Salvo
          auto-maps the headers; you review and correct below.
        </p>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-canvas px-6 py-10 text-center hover:border-gold">
          <span className="text-sm font-medium">
            {busy ? "Parsing…" : filename || "Choose a CSV file"}
          </span>
          <span className="text-xs text-ink-2">click to browse</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="mt-3 text-center text-xs text-ink-2">
          or{" "}
          <button type="button" onClick={loadSample} className="text-steel hover:underline">
            load a sample PropStream list
          </button>
        </div>
      </div>

      {mapping && cls && (
        <>
          <div className="panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold">Review mapping</h3>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${KIND_BADGE[cls.kind]}`}
                >
                  {cls.kind}
                </span>
              </div>
              <span className="tnum text-xs text-ink-2">{rows.length} rows</span>
            </div>

            {cls.missing.length > 0 && (
              <div className="mb-4 rounded-lg border border-loss/30 bg-loss/5 px-3 py-2 text-sm text-loss">
                Missing required field{cls.missing.length > 1 ? "s" : ""}:{" "}
                {cls.missing.join(", ")}. Map {cls.missing.length > 1 ? "them" : "it"} below to run.
              </div>
            )}

            <MappingGrid
              headers={headers}
              mapping={mapping}
              missing={cls.missing}
              onChange={updateMap}
            />
          </div>

          <div className="panel p-5">
            <h3 className="mb-1 text-base font-semibold">Enrichment (optional)</h3>
            <p className="mb-3 text-sm text-ink-2">
              Upload a skip-trace / phone list to join owner contact info by address. Only blank
              fields are filled — existing contacts are never overwritten.
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-canvas px-3 py-1.5 text-sm hover:border-steel">
              {enrichName || "Add skip-trace CSV"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => onEnrichFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3">
            {cls.kind === "incomplete" && (
              <span className="text-sm text-loss">Resolve required fields to continue.</span>
            )}
            <button
              type="button"
              disabled={cls.missing.length > 0}
              onClick={loadIntoConsole}
              className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              Load into console →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
