"use client";

import { DEFAULT_SETTINGS, type Settings } from "@/lib/engine/types";

const NUM_FIELDS: { key: keyof Settings; label: string; suffix?: string }[] = [
  { key: "downPct", label: "Down %", suffix: "%" },
  { key: "downCap", label: "Down cap", suffix: "$" },
  { key: "amortMonths", label: "Amort months" },
  { key: "tolerance", label: "Pmt tolerance", suffix: "$" },
  { key: "sellingPct", label: "Selling %", suffix: "%" },
  { key: "cashPct", label: "Cash %", suffix: "%" },
];

const BOOL_FIELDS: { key: keyof Settings; label: string }[] = [
  { key: "requirePositiveFinanced", label: "Require financed > 0" },
  { key: "requireCashClears", label: "Require cash clears loan" },
  { key: "requireKnownLoan", label: "Require known loan (cash)" },
];

export function SettingsPanel({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
}) {
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide">Underwriting</h3>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_SETTINGS })}
          className="text-xs text-steel hover:underline"
        >
          Reset
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {NUM_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-[11px] text-ink-2">{f.label}</span>
            <input
              type="number"
              value={settings[f.key] as number}
              onChange={(e) => onChange({ ...settings, [f.key]: Number(e.target.value) })}
              className="tnum w-full rounded-md border border-line bg-canvas px-2 py-1 text-sm"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {BOOL_FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings[f.key] as boolean}
              onChange={(e) => onChange({ ...settings, [f.key]: e.target.checked })}
              className="accent-[var(--gold)]"
            />
            {f.label}
          </label>
        ))}
      </div>
    </div>
  );
}
