"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import {
  autoMap,
  classifyFile,
  FIELD_LABELS,
  FIELD_ORDER,
  normalizeWithMap,
  enrich,
  setMapping as applyFieldMapping,
  type FieldKey,
  type Mapping,
  type Property,
} from "@/lib/engine";
import { useSalvo } from "@/lib/store";

type RawRow = Record<string, unknown>;

function KindBadge({ kind }: { kind: string }) {
  const cls =
    kind === "base"
      ? "badge-gain"
      : kind === "enrichment"
        ? "badge-steel"
        : "badge-dnc";
  return <span className={`badge ${cls}`}>{kind}</span>;
}

export function SmartImport() {
  const router = useRouter();
  const {
    properties,
    filename,
    mapping,
    headers,
    setProperties,
    setMapping,
    setHeaders,
  } = useSalvo();

  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [enrichNote, setEnrichNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const enrichRef = useRef<HTMLInputElement>(null);

  const classification = useMemo(
    () => (mapping ? classifyFile(mapping) : null),
    [mapping],
  );

  const applyFile = useCallback(
    (file: File, asEnrichment = false) => {
      setError(null);
      setEnrichNote(null);
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const hdrs = res.meta.fields?.filter(Boolean) ?? [];
          if (!hdrs.length) {
            setError("No headers found in CSV.");
            return;
          }
          const map = autoMap(hdrs);
          const kind = classifyFile(map);

          if (asEnrichment) {
            if (!properties.length) {
              setError("Import a base list before uploading enrichment.");
              return;
            }
            const add = normalizeWithMap(res.data, map, hdrs);
            const joined = enrich(properties, add);
            const filled = joined.filter(
              (p, i) =>
                (!properties[i].owner_cell && p.owner_cell) ||
                (!properties[i].owner_email && p.owner_email),
            ).length;
            setProperties(joined, filename);
            setEnrichNote(
              `Enrichment joined: ${filled} contacts filled from ${file.name}`,
            );
            return;
          }

          setHeaders(hdrs);
          setMapping(map);
          setRawRows(res.data);

          if (kind.kind === "enrichment") {
            setError(null);
            setShowMap(true);
            // still allow preview normalize without home_value
            const props = normalizeWithMap(res.data, map, hdrs);
            setProperties(props, file.name);
            return;
          }

          const props = normalizeWithMap(res.data, map, hdrs);
          setProperties(props, file.name);
          setShowMap(true);
        },
        error: (err) => setError(err.message),
      });
    },
    [filename, properties, setHeaders, setMapping, setProperties],
  );

  const onRemap = (field: FieldKey, header: string | null) => {
    if (!mapping) return;
    const next = applyFieldMapping(mapping, field, header);
    setMapping(next);
    const props = normalizeWithMap(rawRows, next, headers);
    setProperties(props, filename);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFile(f);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import</h1>
          <p className="text-sm text-[var(--ink-2)] mt-1">
            Drop any PropStream / PropWire / BatchLeads CSV. Salvo smart-maps
            headers, then you review before blasting.
          </p>
        </div>
        {classification && (
          <div className="flex items-center gap-2">
            <KindBadge kind={classification.kind} />
            {filename && (
              <span className="text-xs text-[var(--ink-2)] font-data">
                {filename} · {properties.length} rows
              </span>
            )}
          </div>
        )}
      </div>

      <div
        className={`dropzone ${drag ? "active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
      >
        <p className="text-sm font-semibold">Drop CSV here or click to browse</p>
        <p className="text-xs text-[var(--ink-2)] mt-1">
          Client-side parse · required: Address + Home Value for a blast-ready
          base list
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) applyFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="text-sm text-[var(--loss)] border border-[var(--loss)]/30 bg-[var(--loss)]/5 px-3 py-2">
          {error}
        </div>
      )}
      {enrichNote && (
        <div className="text-sm text-[var(--gain)] border border-[var(--gain)]/30 bg-[var(--gain)]/5 px-3 py-2">
          {enrichNote}
        </div>
      )}

      {classification?.missing.length ? (
        <div className="text-sm text-[var(--warn)] border border-[var(--warn)]/30 bg-[var(--warn)]/5 px-3 py-2">
          Missing required:{" "}
          {classification.missing.map((f) => FIELD_LABELS[f]).join(", ")}.
          {classification.kind === "enrichment"
            ? " This looks like a skip-trace / phone list — use it to enrich a base list."
            : " Map them below or re-upload."}
        </div>
      ) : null}

      {mapping && showMap && (
        <MappingGrid
          mapping={mapping}
          headers={headers}
          onChange={onRemap}
        />
      )}

      <div className="flex flex-wrap gap-3">
        {properties.length > 0 && classification?.kind === "base" && (
          <button
            className="btn btn-blast"
            onClick={() => router.push("/offers")}
          >
            Continue to Offers →
          </button>
        )}
        {properties.length > 0 && (
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowMap((v) => !v)}
            >
              {showMap ? "Hide mapping" : "Review mapping"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => enrichRef.current?.click()}
            >
              Upload enrichment / skip-trace
            </button>
            <input
              ref={enrichRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) applyFile(f, true);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {properties.length > 0 && (
        <PreviewTable properties={properties.slice(0, 8)} />
      )}
    </div>
  );
}

function MappingGrid({
  mapping,
  headers,
  onChange,
}: {
  mapping: Mapping;
  headers: string[];
  onChange: (field: FieldKey, header: string | null) => void;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          Review mapping
        </h2>
        <span className="text-xs text-[var(--ink-2)]">
          auto = exact · guess = fuzzy · set = manual
        </span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FIELD_ORDER.map((field) => {
          const m = mapping[field];
          return (
            <label key={field} className="block">
              <span className="label flex items-center gap-2">
                {FIELD_LABELS[field]}
                {m.confidence !== "none" && (
                  <span
                    className={`badge ${
                      m.confidence === "auto"
                        ? "badge-gain"
                        : m.confidence === "guess"
                          ? "badge-gold"
                          : "badge-steel"
                    }`}
                  >
                    {m.confidence}
                  </span>
                )}
              </span>
              <select
                className="select"
                value={m.header ?? ""}
                onChange={(e) =>
                  onChange(field, e.target.value === "" ? null : e.target.value)
                }
              >
                <option value="">— none —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PreviewTable({ properties }: { properties: Property[] }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide mb-2">
        Preview
      </h2>
      <div className="table-wrap max-h-80">
        <table className="data">
          <thead>
            <tr>
              <th>Address</th>
              <th>City</th>
              <th>Value</th>
              <th>Loan</th>
              <th>Rent</th>
              <th>Agent / Owner</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.address}>
                <td>{p.address}</td>
                <td>{p.city ?? "—"}</td>
                <td className="font-data">
                  {p.home_value
                    ? `$${p.home_value.toLocaleString()}`
                    : "—"}
                </td>
                <td className="font-data">
                  {p.loan_balance != null
                    ? `$${p.loan_balance.toLocaleString()}`
                    : "—"}
                </td>
                <td className="font-data">
                  {p.monthly_rent != null
                    ? `$${p.monthly_rent.toLocaleString()}`
                    : "—"}
                </td>
                <td className="text-xs">
                  {p.agent_email || p.owner_email || p.owner_cell || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
