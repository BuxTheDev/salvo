"use client";

import type { Settings } from "@/lib/engine";

interface SettingsPanelProps {
  settings: Settings;
  onChange: (s: Settings) => void;
}

function Field({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number | boolean;
  onChange: (v: number | boolean) => void;
  step?: number;
}) {
  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-line"
        />
        {label}
      </label>
    );
  }
  return (
    <label className="block text-sm">
      <span className="text-ink-2 text-xs">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="mt-1 w-full rounded border border-line bg-panel px-2 py-1.5 mono-data text-sm"
      />
    </label>
  );
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const set = (key: keyof Settings, val: number | boolean) =>
    onChange({ ...settings, [key]: val });

  return (
    <div className="bg-panel rounded-lg border border-line p-4 panel-shadow">
      <h3 className="text-sm font-semibold mb-3">Underwriting Settings</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Down %" value={settings.downPct} onChange={(v) => set("downPct", v as number)} />
        <Field label="Down Cap $" value={settings.downCap} onChange={(v) => set("downCap", v as number)} step={1000} />
        <Field label="Amort (mo)" value={settings.amortMonths} onChange={(v) => set("amortMonths", v as number)} />
        <Field label="Tolerance $" value={settings.tolerance} onChange={(v) => set("tolerance", v as number)} />
        <Field label="Selling %" value={settings.sellingPct} onChange={(v) => set("sellingPct", v as number)} />
        <Field label="Cash %" value={settings.cashPct} onChange={(v) => set("cashPct", v as number)} />
      </div>
      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-line">
        <Field label="Require positive financed" value={settings.requirePositiveFinanced} onChange={(v) => set("requirePositiveFinanced", v as boolean)} />
        <Field label="Require cash clears loan" value={settings.requireCashClears} onChange={(v) => set("requireCashClears", v as boolean)} />
        <Field label="Require known loan" value={settings.requireKnownLoan} onChange={(v) => set("requireKnownLoan", v as boolean)} />
      </div>
    </div>
  );
}
