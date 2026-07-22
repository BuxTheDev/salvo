"use client";

interface Stat {
  label: string;
  value: string | number;
  accent?: "gold" | "steel" | "gain" | "warn" | "loss";
}

const ACCENT: Record<NonNullable<Stat["accent"]>, string> = {
  gold: "var(--gold)",
  steel: "var(--steel)",
  gain: "var(--gain)",
  warn: "var(--warn)",
  loss: "var(--loss)",
};

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="bg-ink px-4 py-3 text-white">
          <div
            className="tnum text-2xl font-semibold"
            style={{ color: s.accent ? ACCENT[s.accent] : "#fff" }}
          >
            {s.value}
          </div>
          <div className="mt-0.5 text-[11px] uppercase tracking-wide text-white/50">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
