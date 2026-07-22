import Papa from "papaparse";
import type { Row } from "@/lib/engine/normalize";

export interface ParsedCsv {
  headers: string[];
  rows: Row[];
}

/** Parse a CSV File client-side into headers + row objects. */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const headers = (res.meta.fields ?? []).filter((h) => h && h.length > 0);
        resolve({ headers, rows: res.data as Row[] });
      },
      error: (err) => reject(err),
    });
  });
}

/** Trigger a browser download of text content. */
export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
