"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Eye, Rocket, CheckSquare, Square } from "lucide-react";

export function BlastBar({
  selectedCount,
  totalCount,
  reachableOnly,
  onReachableOnlyChange,
  onSelectAll,
  onSelectNone,
  onExportCsv,
  onPreviewPayload,
}: {
  selectedCount: number;
  totalCount: number;
  reachableOnly: boolean;
  onReachableOnlyChange: (v: boolean) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onExportCsv: () => void;
  onPreviewPayload: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3 shadow-[var(--shadow-panel)]">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            <CheckSquare /> Select all
          </Button>
          <Button variant="ghost" size="sm" onClick={onSelectNone}>
            <Square /> Clear
          </Button>
          <span className="font-mono-data text-sm text-ink-2">
            {selectedCount} / {totalCount} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={reachableOnly} onCheckedChange={onReachableOnlyChange} id="reachable-only" />
          <Label htmlFor="reachable-only" className="normal-case text-ink">
            Reachable only
          </Label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onPreviewPayload} disabled={selectedCount === 0}>
          <Eye /> Preview payload
        </Button>
        <Button variant="secondary" onClick={onExportCsv} disabled={selectedCount === 0}>
          <Download /> Export GHL CSV
        </Button>
        <Button onClick={onExportCsv} disabled={selectedCount === 0}>
          <Rocket /> Blast {selectedCount > 0 ? `(${selectedCount})` : ""}
        </Button>
      </div>
    </div>
  );
}
