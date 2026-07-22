"use client";

import { BlastBar } from "@/components/salvo/BlastBar";
import { ModeControls } from "@/components/salvo/ModeControls";
import { ResultsTable } from "@/components/salvo/ResultsTable";
import { SettingsPanel } from "@/components/salvo/SettingsPanel";
import { StatStrip } from "@/components/salvo/StatStrip";
import { filterReachable, getStats, qualifyProperties } from "@/lib/engine";
import { useSalvo } from "@/lib/store";
import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OffersPage() {
  const {
    properties,
    settings,
    setSettings,
    target,
    setTarget,
    mode,
    setMode,
    reachableOnly,
    setReachableOnly,
    selected,
    toggleSelected,
    selectAllReady,
  } = useSalvo();

  const rows = useMemo(
    () => qualifyProperties(properties, settings, target, mode),
    [properties, settings, target, mode]
  );

  const displayed = useMemo(
    () => filterReachable(rows, reachableOnly),
    [rows, reachableOnly]
  );

  const stats = useMemo(() => getStats(rows), [rows]);

  const readyAddresses = displayed.filter((r) => r.ready).map((r) => r.property.address);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offers</h1>
          <p className="text-sm text-ink-2">
            Underwrite, qualify, and blast your list
          </p>
        </div>
        {properties.length === 0 && (
          <Link href="/import">
            <Button variant="outline">Import List</Button>
          </Link>
        )}
      </div>

      <ModeControls
        target={target}
        mode={mode}
        onTargetChange={setTarget}
        onModeChange={setMode}
      />

      <SettingsPanel settings={settings} onChange={setSettings} />

      <StatStrip {...stats} />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={reachableOnly}
          onChange={(e) => setReachableOnly(e.target.checked)}
          className="rounded border-line"
        />
        Reachable only ({stats.reachable} of {stats.ready} ready)
      </label>

      <ResultsTable
        rows={displayed}
        mode={mode}
        selected={selected}
        onToggle={toggleSelected}
        onSelectAll={() => selectAllReady(readyAddresses)}
      />

      <BlastBar
        properties={properties}
        settings={settings}
        target={target}
        mode={mode}
        selected={selected}
      />
    </div>
  );
}
