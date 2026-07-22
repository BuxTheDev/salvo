"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { autoMap, classify, type Field, type FieldMap } from "@/lib/engine/mapper";
import { normalizeWithMap } from "@/lib/engine/normalize";
import { MappingGrid } from "@/components/salvo/MappingGrid";
import { FileKindBadge } from "@/components/salvo/FileKindBadge";
import { useSalvoStore } from "@/lib/store/salvo-store";

interface ParsedFile {
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
}

function useCsvParser(onParsed: (file: ParsedFile) => void) {
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [parsing, setParsing] = useState(false);

  const parseFile = useCallback(
    (file: File) => {
      setParsing(true);
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const next: ParsedFile = {
            filename: file.name,
            headers: results.meta.fields ?? [],
            rows: results.data,
          };
          setParsed(next);
          setParsing(false);
          onParsed(next);
        },
        error: (err) => {
          toast.error(`Failed to parse ${file.name}: ${err.message}`);
          setParsing(false);
        },
      });
    },
    [onParsed],
  );

  return { parsed, parsing, parseFile };
}

function Dropzone({ onFile, label }: { onFile: (file: File) => void; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        dragging ? "border-gold bg-gold/5" : "border-line bg-panel hover:border-steel/50"
      }`}
    >
      <UploadCloud className="h-8 w-8 text-ink-2" />
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="text-xs text-ink-2">Drop a CSV here, or click to browse — PropStream, PropWire, BatchLeads, or any CSV.</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}

export default function ImportPage() {
  const router = useRouter();
  const [map, setMap] = useState<FieldMap>({});
  const { parsed, parsing, parseFile } = useCsvParser((file) => setMap(autoMap(file.headers)));
  const setProperties = useSalvoStore((s) => s.setProperties);
  const mergeEnrichment = useSalvoStore((s) => s.mergeEnrichment);
  const hasBase = useSalvoStore((s) => s.properties.length > 0);

  const handleFile = useCallback(
    (file: File) => {
      parseFile(file);
    },
    [parseFile],
  );

  const classification = useMemo(() => classify(map), [map]);

  const handleMapChange = (field: Field, header: string | null) => {
    setMap((prev) => {
      const next = { ...prev };
      if (header === null) {
        delete next[field];
      } else {
        next[field] = { header, confidence: "set" };
      }
      return next;
    });
  };

  const handleImportBase = () => {
    if (!parsed) return;
    const properties = normalizeWithMap(parsed.rows, map, parsed.headers);
    setProperties(properties, {
      filename: parsed.filename,
      kind: classification.kind,
      rowCount: properties.length,
      importedAt: new Date().toISOString(),
    });
    toast.success(`Imported ${properties.length} properties from ${parsed.filename}`);
    router.push("/offers");
  };

  const handleMergeEnrichment = () => {
    if (!parsed) return;
    const properties = normalizeWithMap(parsed.rows, map, parsed.headers);
    mergeEnrichment(properties);
    toast.success(`Enriched contacts from ${properties.length} rows in ${parsed.filename}`);
    router.push("/offers");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Import</h1>
        <p className="text-sm text-ink-2">
          Upload a property list. Salvo auto-maps the headers — review below, then blast to the Offers console.
        </p>
      </div>

      {!parsed && (
        <Card>
          <CardContent className="pt-5">
            <Dropzone onFile={handleFile} label={parsing ? "Parsing…" : "Upload property list"} />
          </CardContent>
        </Card>
      )}

      {parsed && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-ink-2" />
                <CardTitle>{parsed.filename}</CardTitle>
                <span className="font-mono-data text-xs text-ink-2">{parsed.rows.length} rows</span>
              </div>
              <FileKindBadge kind={classification.kind} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {classification.missing.length > 0 && (
                <p className="text-sm text-loss">
                  Missing required field{classification.missing.length > 1 ? "s" : ""}:{" "}
                  {classification.missing.join(", ")}. Map {classification.missing.length > 1 ? "them" : "it"} below to continue.
                </p>
              )}

              <CardDescription>Review mapping — every field is a dropdown. auto = exact match, guess = fuzzy match, set = manual.</CardDescription>
              <MappingGrid headers={parsed.headers} map={map} onChange={handleMapChange} />

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
                {classification.kind === "enrichment" && hasBase && (
                  <Button variant="steel" disabled={classification.missing.length > 0} onClick={handleMergeEnrichment}>
                    <CheckCircle2 /> Merge as enrichment into current list
                  </Button>
                )}
                <Button disabled={classification.missing.length > 0} onClick={handleImportBase}>
                  Import as base list <ArrowRight />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
