"use client";

import { FIELD_SPECS, type FieldMapping, type MapSource } from "@/lib/engine/mapper";
import type { FieldKey } from "@/lib/engine/types";

const SOURCE_STYLE: Record<MapSource, { label: string; cls: string }> = {
  auto: { label: "auto", cls: "bg-gain/10 text-gain" },
  guess: { label: "guess", cls: "bg-warn/15 text-warn" },
  set: { label: "set", cls: "bg-steel/10 text-steel" },
  none: { label: "—", cls: "bg-canvas text-ink-2" },
};

export function MappingGrid({
  headers,
  mapping,
  missing,
  onChange,
}: {
  headers: string[];
  mapping: FieldMapping;
  missing: FieldKey[];
  onChange: (field: FieldKey, header: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {FIELD_SPECS.map((spec) => {
        const current = mapping.map[spec.key] ?? "";
        const src = (mapping.source[spec.key] ?? "none") as MapSource;
        const isMissing = missing.includes(spec.key);
        const style = SOURCE_STYLE[current ? src : "none"];
        return (
          <div
            key={spec.key}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
              isMissing ? "border-loss/40 bg-loss/5" : "border-line bg-panel"
            }`}
          >
            <div className="w-36 shrink-0 text-sm">
              {spec.label}
              {spec.required && <span className="ml-1 text-loss">*</span>}
            </div>
            <select
              value={current}
              onChange={(e) => onChange(spec.key, e.target.value || null)}
              className="min-w-0 flex-1 rounded-md border border-line bg-canvas px-2 py-1 text-sm"
            >
              <option value="">— none —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span
              className={`w-12 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] uppercase ${style.cls}`}
            >
              {style.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
