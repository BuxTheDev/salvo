"use client";

import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/engine";
import type { OfferMode, Property, Settings, Target } from "@/lib/engine";

interface BlastBarProps {
  properties: Property[];
  settings: Settings;
  target: Target;
  mode: OfferMode;
  selected: Set<string>;
}

export function BlastBar({ properties, settings, target, mode, selected }: BlastBarProps) {
  const count = selected.size;

  const handleExport = () => {
    const csv = exportToCsv(
      properties,
      settings,
      target,
      mode,
      count > 0 ? selected : undefined
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salvo-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-panel rounded-lg border border-line p-4 panel-shadow flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold">Blast</h3>
        <p className="text-xs text-ink-2 mt-0.5">
          {count > 0 ? `${count} selected` : "All ready properties"} → GHL-mapped CSV
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={properties.length === 0}>
          Generate PDF
        </Button>
        <Button
          variant="gold"
          size="lg"
          onClick={handleExport}
          disabled={properties.length === 0}
        >
          Export CSV
        </Button>
      </div>
    </div>
  );
}
