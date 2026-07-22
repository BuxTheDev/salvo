import { fcT } from "@/lib/engine/format";
import type { OfferRowsResult } from "@/lib/hooks/useOfferRows";
import type { Offer } from "@/lib/engine/types";

function Stat({ label, value, accent }: { label: string; value: string; accent?: "gold" | "steel" | "loss" | "gain" }) {
  const color = accent === "gold" ? "text-gold" : accent === "steel" ? "text-steel" : accent === "loss" ? "text-loss" : accent === "gain" ? "text-gain" : "text-white";
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">{label}</span>
      <span className={`font-mono-data text-xl font-semibold ${color}`}>{value}</span>
    </div>
  );
}

export function StatStrip({ stats, totalRows, offer }: { stats: OfferRowsResult; totalRows: number; offer: Offer }) {
  const totalDiff = stats.reachableRows.reduce((sum, r) => sum + (r.underwrite.diff && r.underwrite.creative_ok ? r.underwrite.diff : 0), 0);
  const totalNetCash = stats.reachableRows.reduce((sum, r) => sum + (r.underwrite.net_cash && r.underwrite.cash_ok ? r.underwrite.net_cash : 0), 0);

  return (
    <div className="flex flex-wrap divide-x divide-white/10 rounded-xl bg-ink text-white shadow-[var(--shadow-outer)]">
      <Stat label="Imported" value={totalRows.toLocaleString()} />
      <Stat label="Ready" value={stats.readyCount.toLocaleString()} accent="gold" />
      <Stat label="Reachable" value={stats.reachableCount.toLocaleString()} accent="steel" />
      <Stat label="DNC flagged" value={stats.dncCount.toLocaleString()} accent="loss" />
      <Stat label="Duplicate contacts" value={stats.duplicateContactCount.toLocaleString()} accent="steel" />
      {(offer === "creative" || offer === "both") && (
        <Stat label="Total SF Difference" value={fcT(totalDiff)} accent="gain" />
      )}
      {(offer === "cash" || offer === "both") && <Stat label="Total Net Cash" value={fcT(totalNetCash)} accent="gain" />}
    </div>
  );
}
