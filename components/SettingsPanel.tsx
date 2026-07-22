"use client";
/** Tunable underwriting terms (spec §4.1). */
import { useSalvo } from "@/lib/store";
import { usd } from "@/lib/engine/format";

function Slider({ label, v, set, min, max, step, unit = "", fmt }: {
  label: string; v: number; set: (v: number) => void;
  min: number; max: number; step: number; unit?: string; fmt?: (v: number) => string;
}) {
  return (
    <div className="sv-slider">
      <div className="sv-slider-top">
        <span>{label}</span>
        <span className="sv-slider-val">{fmt ? fmt(v) : `${v}${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(parseFloat(e.target.value))} />
    </div>
  );
}

export function SettingsPanel() {
  const s = useSalvo((st) => st.settings);
  const setSetting = useSalvo((st) => st.setSetting);
  return (
    <aside className="sv-settings">
      <h3 className="sv-h">Terms</h3>
      <Slider label="Down = % of equity" v={s.downPct} set={(v) => setSetting("downPct", v)} min={0} max={100} step={5} unit="%" />
      <Slider label="Down cap" v={s.downCap} set={(v) => setSetting("downCap", v)} min={0} max={60000} step={2500} fmt={usd} />
      <Slider label="Amortization" v={s.amortMonths} set={(v) => setSetting("amortMonths", v)} min={120} max={480} step={12} fmt={(v) => `${v / 12}yr`} />
      <Slider label="Payment tolerance" v={s.tolerance} set={(v) => setSetting("tolerance", v)} min={0} max={800} step={50} fmt={(v) => `rent+$${v}`} />
      <Slider label="Selling cost" v={s.sellingPct} set={(v) => setSetting("sellingPct", v)} min={6} max={15} step={0.5} unit="%" />
      <Slider label="Cash offer" v={s.cashPct} set={(v) => setSetting("cashPct", v)} min={60} max={95} step={1} unit="%" />
      <label className="sv-toggle">
        <input type="checkbox" checked={s.requirePositiveFinanced} onChange={(e) => setSetting("requirePositiveFinanced", e.target.checked)} />
        Skip degenerate creatives
      </label>
      <label className="sv-toggle">
        <input type="checkbox" checked={s.requireCashClears} onChange={(e) => setSetting("requireCashClears", e.target.checked)} />
        Cash must clear the loan
      </label>
      <label className="sv-toggle">
        <input type="checkbox" checked={s.requireKnownLoan} onChange={(e) => setSetting("requireKnownLoan", e.target.checked)} />
        Cash needs known loan balance
      </label>
    </aside>
  );
}
