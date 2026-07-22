"use client";

import { Badge } from "@/components/ui/badge";
import { FIELD_SPECS, type FieldMapping, type MappingMethod } from "@/lib/engine";

interface MappingGridProps {
  headers: string[];
  mappings: FieldMapping[];
  onMappingChange: (field: string, header: string) => void;
}

function methodBadge(method: MappingMethod) {
  if (method === "exact") return <Badge variant="gain">auto</Badge>;
  if (method === "guess") return <Badge variant="warn">guess</Badge>;
  return <Badge variant="steel">set</Badge>;
}

export function MappingGrid({ headers, mappings, onMappingChange }: MappingGridProps) {
  const mapByField = new Map(mappings.map((m) => [m.field, m]));

  return (
    <div className="bg-panel rounded-lg border border-line panel-shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-line">
        <h3 className="text-sm font-semibold">Review Mapping</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas/50 text-left text-xs text-ink-2">
              <th className="p-3">Field</th>
              <th className="p-3">Required</th>
              <th className="p-3">CSV Header</th>
              <th className="p-3">Method</th>
            </tr>
          </thead>
          <tbody>
            {FIELD_SPECS.map((spec) => {
              const mapping = mapByField.get(spec.key);
              return (
                <tr key={spec.key} className="border-b border-line last:border-0">
                  <td className="p-3 font-mono text-xs">{spec.key}</td>
                  <td className="p-3">{spec.required ? "✅" : ""}</td>
                  <td className="p-3">
                    <select
                      value={mapping?.header ?? ""}
                      onChange={(e) => onMappingChange(spec.key, e.target.value)}
                      className="w-full rounded border border-line bg-panel px-2 py-1 text-sm"
                    >
                      <option value="">— none —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    {mapping ? methodBadge(mapping.method) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
