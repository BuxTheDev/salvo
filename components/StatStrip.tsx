"use client";
/** Headline metrics for the current mode. */
import { usdk } from "@/lib/engine/format";
import { OFFERS } from "@/lib/engine/export";
import type { ModeStats } from "@/lib/engine/score";
import { useSalvo } from "@/lib/store";

function Stat({ n, l, tone = "", wide }: { n: React.ReactNode; l: string; tone?: string; wide?: boolean }) {
  return (
    <div className={`sv-stat ${wide ? "wide" : ""}`}>
      <div className={`sv-stat-n ${tone}`}>{n}</div>
      <div className="sv-stat-l">{l}</div>
    </div>
  );
}

export function StatStrip({ stats }: { stats: ModeStats }) {
  const offer = useSalvo((s) => s.offer);
  const target = useSalvo((s) => s.target);
  return (
    <div className="sv-stats">
      <Stat n={stats.scanned} l="Scanned" />
      <Stat n={stats.ready} l={`${OFFERS[offer]} ready`} tone="gain" />
      <Stat n={stats.reachable} l="reachable contact" tone={target === "seller" ? "gold" : "steel"} />
      <Stat n={stats.dupContacts} l="shared contacts" tone="steel" />
      <Stat n={usdk(stats.avg)} l={offer === "cash" ? "avg net cash" : "avg seller upside"} tone="gold" wide />
    </div>
  );
}
