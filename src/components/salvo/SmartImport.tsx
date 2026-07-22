"use client";

import { useCallback, useState } from "react";
import Papa from "papaparse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MappingGrid } from "@/components/salvo/MappingGrid";
import {
  autoMapHeaders,
  classifyFile,
  enrich,
  getMissingRequired,
  mappingToRecord,
  normalizeWithMap,
  type FieldMapping,
  type FileKind,
} from "@/lib/engine";
import { useSalvo } from "@/lib/store";

function kindBadge(kind: FileKind) {
  if (kind === "base") return <Badge variant="gain">base — ready to blast</Badge>;
  if (kind === "enrichment") return <Badge variant="steel">enrichment — skip-trace join</Badge>;
  return <Badge variant="loss">incomplete</Badge>;
}

export function SmartImport({ onComplete }: { onComplete?: () => void }) {
  const {
    setProperties,
    setMappings,
    mappings,
    setHeaders,
    headers,
    setRawRows,
    rawRows,
    setFilename,
    filename,
    properties,
  } = useSalvo();

  const [kind, setKind] = useState<FileKind>("incomplete");
  const [enrichFile, setEnrichFile] = useState<File | null>(null);

  const processFile = useCallback(
    (file: File, isEnrichment = false) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const hdrs = results.meta.fields ?? [];
          const auto = autoMapHeaders(hdrs);
          const fileKind = classifyFile(auto);

          if (isEnrichment && properties.length > 0) {
            const enriched = enrich(properties, results.data, mappingToRecord(auto));
            setProperties(enriched);
            setEnrichFile(file);
            return;
          }

          setHeaders(hdrs);
          setRawRows(results.data);
          setMappings(auto);
          setKind(fileKind);
          setFilename(file.name);

          if (fileKind === "base") {
            const props = normalizeWithMap(results.data, mappingToRecord(auto));
            setProperties(props);
          }
        },
      });
    },
    [properties, setHeaders, setMappings, setProperties, setRawRows, setFilename]
  );

  const handleMappingChange = (field: string, header: string) => {
    const updated: FieldMapping[] = mappings.filter((m) => m.field !== field);
    if (header) {
      updated.push({ field, header, method: "set" });
    }
    setMappings(updated);
    const fileKind = classifyFile(updated);
    setKind(fileKind);

    if (fileKind === "base" || getMissingRequired(updated).length === 0) {
      const props = normalizeWithMap(rawRows, mappingToRecord(updated));
      setProperties(props);
    }
  };

  const missing = getMissingRequired(mappings);

  return (
    <div className="space-y-4">
      <div className="bg-panel rounded-lg border border-line p-6 panel-shadow">
        <h2 className="text-lg font-semibold mb-1">Import Property List</h2>
        <p className="text-sm text-ink-2 mb-4">
          Drop a PropStream, PropWire, BatchLeads, or any CSV. Salvo auto-maps headers.
        </p>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-line rounded-lg p-8 cursor-pointer hover:border-gold/50 transition-colors">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />
          <span className="text-sm text-ink-2">
            {filename || "Click to upload CSV"}
          </span>
        </label>

        {filename && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{filename}</span>
            {kindBadge(kind)}
            {rawRows.length > 0 && (
              <span className="text-xs text-ink-2">{rawRows.length} rows</span>
            )}
          </div>
        )}

        {missing.length > 0 && (
          <div className="mt-3 text-sm text-warn">
            Missing required: {missing.join(", ")}
          </div>
        )}
      </div>

      {headers.length > 0 && (
        <MappingGrid
          headers={headers}
          mappings={mappings}
          onMappingChange={handleMappingChange}
        />
      )}

      {kind === "enrichment" && properties.length > 0 && (
        <div className="bg-panel rounded-lg border border-line p-4 panel-shadow">
          <p className="text-sm mb-2">Upload a skip-trace file to enrich contacts.</p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file, true);
            }}
          />
          {enrichFile && (
            <p className="text-xs text-ink-2 mt-2">Enriched with {enrichFile.name}</p>
          )}
        </div>
      )}

      {properties.length > 0 && (
        <div className="flex justify-end">
          <Button variant="gold" onClick={onComplete}>
            Continue to Offers →
          </Button>
        </div>
      )}
    </div>
  );
}
