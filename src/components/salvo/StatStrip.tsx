"use client";

interface StatStripProps {
  total: number;
  ready: number;
  reachable: number;
  creative: number;
  cash: number;
  dnc: number;
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="text-center px-4">
      <div className={`mono-data text-2xl font-semibold ${accent ?? "text-white"}`}>{value}</div>
      <div className="text-xs text-white/60 mt-0.5">{label}</div>
    </div>
  );
}

export function StatStrip({ total, ready, reachable, creative, cash, dnc }: StatStripProps) {
  return (
    <div className="bg-ink rounded-lg px-4 py-3 flex flex-wrap justify-around gap-2">
      <Stat label="Total" value={total} />
      <Stat label="Ready" value={ready} accent="text-gold" />
      <Stat label="Reachable" value={reachable} accent="text-gain" />
      <Stat label="Creative" value={creative} />
      <Stat label="Cash" value={cash} />
      <Stat label="DNC" value={dnc} accent="text-warn" />
    </div>
  );
}
