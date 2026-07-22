"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { evaluate, type RowResult } from "@/lib/engine/select";
import type { Offer, Target } from "@/lib/engine/types";
import { useStore } from "@/lib/store";
import { Segmented } from "./Segmented";
import { SettingsPanel } from "./SettingsPanel";
import { StatStrip } from "./StatStrip";
import { ResultsTable } from "./ResultsTable";
import { BlastBar } from "./BlastBar";
import { PayloadPreview } from "./PayloadPreview";
import { LOIPreview } from "./loi/LOIPreview";

export function OffersConsole() {
  const { properties, settings, setSettings } = useStore();
  const [target, setTarget] = useState<Target>("agent");
  const [offer, setOffer] = useState<Offer>("creative");
  const [reachableOnly, setReachableOnly] = useState(false);
  const [preview, setPreview] = useState<RowResult | null>(null);

  const allRows = useMemo(
    () => evaluate(properties, settings, target, offer),
    [properties, settings, target, offer],
  );

  const rows = useMemo(
    () => (reachableOnly ? allRows.filter((r) => r.reachable) : allRows),
    [allRows, reachableOnly],
  );

  const readyRows = useMemo(() => rows.filter((r) => r.ready), [rows]);

  const stats = useMemo(() => {
    const ready = allRows.filter((r) => r.ready);
    const reachable = ready.filter((r) => r.reachable).length;
    const dnc = allRows.filter((r) => r.dnc).length;
    const dupContacts = new Set(
      ready.filter((r) => r.dupCount > 1 && r.contact.email).map((r) => r.contact.email),
    ).size;
    return [
      { label: "Properties", value: allRows.length },
      { label: "Offers Ready", value: ready.length, accent: "gold" as const },
      { label: "Reachable", value: reachable, accent: "gain" as const },
      { label: "DNC Flags", value: dnc, accent: "loss" as const },
      { label: "Dup Contacts", value: dupContacts, accent: "steel" as const },
    ];
  }, [allRows]);

  if (properties.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-semibold">No list loaded</h2>
        <p className="mt-2 max-w-md text-sm text-ink-2">
          Import a property list to underwrite creative and cash offers for every row, then fire
          personalized LOIs at volume.
        </p>
        <Link
          href="/import"
          className="mt-6 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-white"
        >
          Import a list →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StatStrip stats={stats} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="panel space-y-4 p-4">
            <Segmented
              label="Target"
              accent="steel"
              value={target}
              onChange={setTarget}
              options={[
                { value: "agent", label: "Agent" },
                { value: "seller", label: "Seller" },
              ]}
            />
            <Segmented
              label="Offer"
              accent="gold"
              value={offer}
              onChange={setOffer}
              options={[
                { value: "creative", label: "Creative" },
                { value: "cash", label: "Cash" },
                { value: "both", label: "Both" },
              ]}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={reachableOnly}
                onChange={(e) => setReachableOnly(e.target.checked)}
                className="accent-[var(--gold)]"
              />
              Reachable only
            </label>
          </div>
          <SettingsPanel settings={settings} onChange={setSettings} />
        </div>

        <div className="space-y-4">
          <BlastBar readyRows={readyRows} target={target} offer={offer} />
          <ResultsTable rows={rows} offer={offer} onPreview={setPreview} />
          <PayloadPreview readyRows={readyRows} target={target} offer={offer} />
        </div>
      </div>

      {preview && (
        <LOIPreview row={preview} offer={offer} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
