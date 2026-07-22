"use client";

import { Settings2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Settings } from "@/lib/engine/types";

function NumberRow({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-mono-data text-sm text-ink">
          {value.toLocaleString()}
          {suffix}
        </span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Label className="normal-case text-ink">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function SettingsPanel({
  settings,
  onChange,
  onReset,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-ink-2" /> Underwriting Settings
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw /> Reset
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NumberRow label="Down % of equity" value={settings.downPct} suffix="%" min={0} max={100} step={1} onChange={(v) => onChange({ downPct: v })} />
        <NumberRow label="Down cap" value={settings.downCap} suffix="" min={0} max={100000} step={1000} onChange={(v) => onChange({ downCap: v })} />
        <NumberRow label="Amortization" value={settings.amortMonths} suffix=" mo" min={12} max={480} step={12} onChange={(v) => onChange({ amortMonths: v })} />
        <NumberRow label="Payment tolerance" value={settings.tolerance} suffix="" min={0} max={1000} step={25} onChange={(v) => onChange({ tolerance: v })} />
        <NumberRow label="Selling costs (industry)" value={settings.sellingPct} suffix="%" min={0} max={20} step={0.5} onChange={(v) => onChange({ sellingPct: v })} />
        <NumberRow label="Cash offer % of value" value={settings.cashPct} suffix="%" min={0} max={100} step={1} onChange={(v) => onChange({ cashPct: v })} />

        <div className="col-span-full flex flex-col gap-1 border-t border-line pt-3 sm:flex-row sm:gap-8">
          <ToggleRow label="Require positive financed" checked={settings.requirePositiveFinanced} onChange={(v) => onChange({ requirePositiveFinanced: v })} />
          <ToggleRow label="Require cash clears" checked={settings.requireCashClears} onChange={(v) => onChange({ requireCashClears: v })} />
          <ToggleRow label="Require known loan (cash)" checked={settings.requireKnownLoan} onChange={(v) => onChange({ requireKnownLoan: v })} />
        </div>
      </CardContent>
    </Card>
  );
}
