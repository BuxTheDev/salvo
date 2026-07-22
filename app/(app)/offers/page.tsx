"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModeControls } from "@/components/salvo/ModeControls";
import { SettingsPanel } from "@/components/salvo/SettingsPanel";
import { StatStrip } from "@/components/salvo/StatStrip";
import { ResultsTable } from "@/components/salvo/ResultsTable";
import { BlastBar } from "@/components/salvo/BlastBar";
import { PayloadPreview } from "@/components/salvo/PayloadPreview";
import { LOIPreview } from "@/components/salvo/LOIPreview";
import { useSalvoStore } from "@/lib/store/salvo-store";
import { useOfferRows, type OfferRow } from "@/lib/hooks/useOfferRows";
import { exportCsv, type ExportRow } from "@/lib/engine/export";
import { isSuppressed } from "@/lib/engine/modes";

export default function OffersPage() {
  const router = useRouter();
  const properties = useSalvoStore((s) => s.properties);
  const batch = useSalvoStore((s) => s.batch);
  const settings = useSalvoStore((s) => s.settings);
  const target = useSalvoStore((s) => s.target);
  const offer = useSalvoStore((s) => s.offer);
  const reachableOnly = useSalvoStore((s) => s.reachableOnly);
  const selectedAddresses = useSalvoStore((s) => s.selectedAddresses);

  const setSettings = useSalvoStore((s) => s.setSettings);
  const resetSettings = useSalvoStore((s) => s.resetSettings);
  const setTarget = useSalvoStore((s) => s.setTarget);
  const setOffer = useSalvoStore((s) => s.setOffer);
  const setReachableOnly = useSalvoStore((s) => s.setReachableOnly);
  const toggleSelected = useSalvoStore((s) => s.toggleSelected);
  const setSelected = useSalvoStore((s) => s.setSelected);
  const suppressions = useSalvoStore((s) => s.suppressions);

  const [showSettings, setShowSettings] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loiRow, setLoiRow] = useState<OfferRow | null>(null);

  const result = useOfferRows(properties, settings, target, offer, reachableOnly);
  const selectedSet = useMemo(() => new Set(selectedAddresses), [selectedAddresses]);

  const selectedRows = useMemo(
    () => result.rows.filter((r) => selectedSet.has(r.property.address)),
    [result.rows, selectedSet],
  );

  const toExportRows = (rows: OfferRow[]): ExportRow[] =>
    rows.map((r) => ({ property: r.property, underwrite: r.underwrite, contact: r.contact, dnc: r.dnc }));

  const handleExportCsv = () => {
    if (selectedRows.length === 0) return;
    const cleared = selectedRows.filter((r) => !isSuppressed(r.contact, suppressions));
    const skipped = selectedRows.length - cleared.length;
    if (cleared.length === 0) {
      toast.error("All selected contacts are suppressed — nothing to export.");
      return;
    }
    const csv = exportCsv(toExportRows(cleared), target, offer);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salvo-blast-${target}-${offer}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${cleared.length} rows for GHL${skipped > 0 ? ` · ${skipped} suppressed contact${skipped > 1 ? "s" : ""} skipped` : ""}`);
  };

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <UploadCloud className="h-10 w-10 text-ink-2" />
          <div>
            <h2 className="text-lg font-semibold text-ink">No properties imported yet</h2>
            <p className="mt-1 text-sm text-ink-2">Import a property list to underwrite creative and cash offers.</p>
          </div>
          <Button onClick={() => router.push("/import")}>
            Go to Import <ArrowRight />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Offers console</h1>
          {batch && (
            <p className="text-sm text-ink-2">
              {batch.filename} · {batch.rowCount} rows · imported {new Date(batch.importedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSettings((v) => !v)}>
            {showSettings ? "Hide settings" : "Show settings"}
          </Button>
          <Link href="/import" className="text-sm text-steel hover:underline">
            Import another list
          </Link>
        </div>
      </div>

      <ModeControls target={target} offer={offer} onTargetChange={setTarget} onOfferChange={setOffer} />

      {showSettings && <SettingsPanel settings={settings} onChange={setSettings} onReset={resetSettings} />}

      <StatStrip stats={result} totalRows={properties.length} offer={offer} />

      <BlastBar
        selectedCount={selectedRows.length}
        totalCount={result.rows.length}
        reachableOnly={reachableOnly}
        onReachableOnlyChange={setReachableOnly}
        onSelectAll={() => setSelected(result.rows.map((r) => r.property.address))}
        onSelectNone={() => setSelected([])}
        onExportCsv={handleExportCsv}
        onPreviewPayload={() => setPreviewOpen(true)}
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <ResultsTable
            rows={result.rows}
            offer={offer}
            selected={selectedSet}
            onToggle={toggleSelected}
            onPreview={(row) => setLoiRow(row)}
          />
        </CardContent>
      </Card>

      <PayloadPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        rows={toExportRows(selectedRows.filter((r) => !isSuppressed(r.contact, suppressions)))}
        target={target}
        offer={offer}
      />
      <LOIPreview row={loiRow} open={!!loiRow} onOpenChange={(o) => !o && setLoiRow(null)} />
    </div>
  );
}
