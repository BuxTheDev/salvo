"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  buildExportRows,
  downloadCsv,
  fcS,
  fcT,
  qualifyProperties,
  toCsv,
  type OfferMode,
  type QualifiedRow,
  type Settings,
  type Target,
} from "@/lib/engine";
import { useSalvo } from "@/lib/store";

export function OffersConsole() {
  const {
    properties,
    filename,
    settings,
    setSettings,
    target,
    setTarget,
    mode,
    setMode,
    reachableOnly,
    setReachableOnly,
    selected,
    setSelected,
  } = useSalvo();

  const [showSettings, setShowSettings] = useState(false);
  const [payloadPreview, setPayloadPreview] = useState<QualifiedRow | null>(
    null,
  );

  const qualified = useMemo(
    () =>
      qualifyProperties(properties, {
        target,
        mode,
        settings,
        reachableOnly,
      }),
    [properties, target, mode, settings, reachableOnly],
  );

  const stats = useMemo(() => {
    let creative = 0;
    let cash = 0;
    let reachable = 0;
    let dnc = 0;
    for (const q of qualifyProperties(properties, {
      target,
      mode: "both",
      settings,
    })) {
      if (q.underwrite.creative_ok) creative++;
      if (q.underwrite.cash_ok) cash++;
    }
    for (const q of qualified) {
      if (q.reachable) reachable++;
      if (q.dnc) dnc++;
    }
    return {
      total: properties.length,
      ready: qualified.length,
      creative,
      cash,
      reachable,
      dnc,
    };
  }, [properties, qualified, settings, target]);

  const selectedRows = useMemo(() => {
    if (selected.size === 0) return qualified;
    return qualified.filter((_, i) => selected.has(i));
  }, [qualified, selected]);

  const toggleAll = () => {
    if (selected.size === qualified.length) setSelected(new Set());
    else setSelected(new Set(qualified.map((_, i) => i)));
  };

  const toggleOne = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };

  const blastCsv = () => {
    const rows = buildExportRows(selectedRows, { target, mode });
    const csv = toCsv(rows, mode);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`salvo-${mode}-${target}-${stamp}.csv`, csv);
  };

  if (!properties.length) {
    return (
      <div className="p-10 text-center space-y-4">
        <h1 className="text-2xl font-bold">Offers console</h1>
        <p className="text-sm text-[var(--ink-2)]">
          Import a list first — then underwrite, filter, and blast.
        </p>
        <Link href="/import" className="btn btn-blast inline-flex">
          Go to Import
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* gunmetal stat banner */}
      <div
        className="px-6 py-4 text-white flex flex-wrap items-center gap-6"
        style={{ background: "var(--ink)" }}
      >
        <div>
          <div className="wordmark text-xs text-white/60 mb-1">Salvo</div>
          <div className="text-lg font-bold leading-tight">
            {filename ?? "Untitled list"}
          </div>
        </div>
        <Stat label="Loaded" value={stats.total} />
        <Stat label="Ready" value={stats.ready} accent />
        <Stat label="Creative" value={stats.creative} />
        <Stat label="Cash" value={stats.cash} />
        <Stat label="Reachable" value={stats.reachable} />
        {stats.dnc > 0 && <Stat label="DNC" value={stats.dnc} warn />}
      </div>

      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-6">
          <ModeAxis
            label="Target"
            color="steel"
            value={target}
            options={[
              { id: "agent", label: "Agent" },
              { id: "seller", label: "Seller" },
            ]}
            onChange={(v) => setTarget(v as Target)}
          />
          <ModeAxis
            label="Offer"
            color="gold"
            value={mode}
            options={[
              { id: "creative", label: "Creative" },
              { id: "cash", label: "Cash" },
              { id: "both", label: "Both" },
            ]}
            onChange={(v) => setMode(v as OfferMode)}
          />
          <label className="flex items-center gap-2 text-sm text-[var(--ink-2)] cursor-pointer">
            <input
              type="checkbox"
              checked={reachableOnly}
              onChange={(e) => setReachableOnly(e.target.checked)}
            />
            Reachable only
          </label>
          <button
            className="btn btn-secondary ml-auto"
            onClick={() => setShowSettings((s) => !s)}
          >
            {showSettings ? "Hide settings" : "Settings"}
          </button>
        </div>

        {showSettings && (
          <SettingsPanel settings={settings} onChange={setSettings} />
        )}

        <ResultsTable
          rows={qualified}
          mode={mode}
          selected={selected}
          onToggleAll={toggleAll}
          onToggle={toggleOne}
          onPreview={setPayloadPreview}
        />

        <BlastBar
          count={selected.size || qualified.length}
          selecting={selected.size > 0}
          onBlast={blastCsv}
          disabled={qualified.length === 0}
        />
      </div>

      {payloadPreview && (
        <PayloadPreview
          row={payloadPreview}
          mode={mode}
          onClose={() => setPayloadPreview(null)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: number;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <div className="text-[0.65rem] uppercase tracking-wider text-white/45">
        {label}
      </div>
      <div
        className="font-data text-xl font-semibold"
        style={{
          color: warn ? "var(--warn)" : accent ? "var(--gold)" : "white",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ModeAxis({
  label,
  color,
  value,
  options,
  onChange,
}: {
  label: string;
  color: "steel" | "gold";
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const hex = color === "steel" ? "var(--steel)" : "var(--gold)";
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5"
        style={{ color: hex }}
      >
        <span className="axis-dot" style={{ background: hex }} />
        {label}
      </span>
      <div className="seg">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={
              value === o.id
                ? color === "steel"
                  ? "active-steel"
                  : "active-gold"
                : ""
            }
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings | ((p: Settings) => Settings)) => void;
}) {
  const num = (key: keyof Settings, label: string, min: number, max: number, step = 1) => (
    <label key={key} className="block">
      <span className="label">{label}</span>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={settings[key] as number}
          onChange={(e) =>
            onChange({ ...settings, [key]: Number(e.target.value) })
          }
        />
        <span className="font-data text-sm w-16 text-right">
          {settings[key] as number}
        </span>
      </div>
    </label>
  );

  return (
    <div className="panel p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {num("downPct", "Down % of equity", 0, 100)}
      {num("downCap", "Down cap ($)", 0, 100000, 1000)}
      {num("amortMonths", "Amort months", 12, 480, 12)}
      {num("tolerance", "Payment tolerance ($)", 0, 1000, 25)}
      {num("sellingPct", "Selling cost %", 0, 20)}
      {num("cashPct", "Cash offer % of value", 50, 100)}
      <label className="flex items-center gap-2 text-sm mt-4">
        <input
          type="checkbox"
          checked={settings.requirePositiveFinanced}
          onChange={(e) =>
            onChange({ ...settings, requirePositiveFinanced: e.target.checked })
          }
        />
        Require positive financed
      </label>
      <label className="flex items-center gap-2 text-sm mt-4">
        <input
          type="checkbox"
          checked={settings.requireCashClears}
          onChange={(e) =>
            onChange({ ...settings, requireCashClears: e.target.checked })
          }
        />
        Cash must clear loan
      </label>
      <label className="flex items-center gap-2 text-sm mt-4">
        <input
          type="checkbox"
          checked={settings.requireKnownLoan}
          onChange={(e) =>
            onChange({ ...settings, requireKnownLoan: e.target.checked })
          }
        />
        Require known loan (cash)
      </label>
    </div>
  );
}

function ResultsTable({
  rows,
  mode,
  selected,
  onToggleAll,
  onToggle,
  onPreview,
}: {
  rows: QualifiedRow[];
  mode: OfferMode;
  selected: Set<number>;
  onToggleAll: () => void;
  onToggle: (i: number) => void;
  onPreview: (r: QualifiedRow) => void;
}) {
  return (
    <div className="table-wrap max-h-[520px]">
      <table className="data">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={rows.length > 0 && selected.size === rows.length}
                onChange={onToggleAll}
              />
            </th>
            <th>Property / Contact</th>
            {mode === "creative" && (
              <>
                <th>Rent vs Pmt</th>
                <th>Down</th>
                <th>SF Difference</th>
              </>
            )}
            {mode === "cash" && (
              <>
                <th>Cash Offer</th>
                <th>Net Cash</th>
                <th>Saved</th>
              </>
            )}
            {mode === "both" && (
              <>
                <th>SF Difference</th>
                <th>Net Cash</th>
                <th>Offers</th>
              </>
            )}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.property.address}-${i}`}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => onToggle(i)}
                />
              </td>
              <td>
                <div className="font-semibold">{r.property.address}</div>
                <div className="text-xs text-[var(--ink-2)] mt-0.5">
                  {r.contact.name ?? "—"} · {r.contact.email ?? r.contact.phone ?? "—"}
                  {r.listingsForContact > 1 && (
                    <span className="badge badge-steel ml-1.5">
                      ×{r.listingsForContact}
                    </span>
                  )}
                  {r.dnc && <span className="badge badge-dnc ml-1.5">DNC</span>}
                </div>
              </td>
              {mode === "creative" && (
                <>
                  <td className="font-data text-xs">
                    {fcT(r.property.monthly_rent)} / {fcT(r.underwrite.total)}
                  </td>
                  <td className="font-data">{fcT(r.underwrite.down)}</td>
                  <td className="font-data font-semibold text-[var(--gold)]">
                    {fcT(r.underwrite.diff)}
                  </td>
                </>
              )}
              {mode === "cash" && (
                <>
                  <td className="font-data">{fcT(r.underwrite.cash)}</td>
                  <td className="font-data font-semibold text-[var(--gain)]">
                    {fcT(r.underwrite.net_cash)}
                  </td>
                  <td className="font-data">{fcT(r.underwrite.industry_costs)}</td>
                </>
              )}
              {mode === "both" && (
                <>
                  <td className="font-data text-[var(--gold)]">
                    {r.underwrite.creative_ok ? fcT(r.underwrite.diff) : "—"}
                  </td>
                  <td className="font-data text-[var(--gain)]">
                    {r.underwrite.cash_ok ? fcT(r.underwrite.net_cash) : "—"}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {r.offerLabels.map((l) => (
                        <span
                          key={l}
                          className={`badge ${l === "CR" ? "badge-gold" : "badge-gain"}`}
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </td>
                </>
              )}
              <td>
                <button
                  className="text-xs font-semibold text-[var(--steel)] underline"
                  onClick={() => onPreview(r)}
                >
                  Preview
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-[var(--ink-2)] py-8">
                No ready offers for this Target × Offer combo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function BlastBar({
  count,
  selecting,
  onBlast,
  disabled,
}: {
  count: number;
  selecting: boolean;
  onBlast: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-[var(--line)] bg-white/95 backdrop-blur px-1 py-3"
    >
      <div className="text-sm text-[var(--ink-2)]">
        {selecting ? (
          <>
            <span className="font-data font-semibold text-[var(--ink)]">
              {count}
            </span>{" "}
            selected
          </>
        ) : (
          <>
            Blast all{" "}
            <span className="font-data font-semibold text-[var(--ink)]">
              {count}
            </span>{" "}
            ready
          </>
        )}
      </div>
      <button className="btn btn-blast" disabled={disabled} onClick={onBlast}>
        Export GHL CSV
      </button>
      <button className="btn btn-secondary" disabled title="Phase 3">
        Generate PDF
      </button>
    </div>
  );
}

function PayloadPreview({
  row,
  mode,
  onClose,
}: {
  row: QualifiedRow;
  mode: OfferMode;
  onClose: () => void;
}) {
  const uw = row.underwrite;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(27,34,40,0.45)" }}
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-lg p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg">{row.property.address}</h3>
            <p className="text-xs text-[var(--ink-2)] mt-0.5">
              {row.contact.name} · {row.contact.viaAgent ? "Agent" : "Seller"}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {mode !== "cash" && (
            <>
              <DT label="Price" value={fcT(uw.price)} />
              <DT label="Down" value={fcT(uw.down)} />
              <DT label="Financed" value={fcT(uw.financed)} />
              <DT label="Payment (m2s)" value={fcT(uw.m2s)} />
              <DT label="SF Difference" value={fcT(uw.diff)} gold />
              <DT label="Seller Profit Trad." value={fcS(uw.net_trad)} />
            </>
          )}
          <DT label="Cash Scenario" value={fcT(uw.cash)} />
          <DT label="Net Cash" value={fcT(uw.net_cash)} gain />
          <DT label="Industry Costs" value={fcT(uw.industry_costs)} />
          <DT label="Home Value" value={fcT(uw.home_value)} />
        </dl>
        <p className="text-xs text-[var(--ink-2)]">
          Buyer: BrightPath Real Estate Solutions, LLC (and/or assigns)
        </p>
      </div>
    </div>
  );
}

function DT({
  label,
  value,
  gold,
  gain,
}: {
  label: string;
  value: string;
  gold?: boolean;
  gain?: boolean;
}) {
  return (
    <>
      <dt className="text-[var(--ink-2)]">{label}</dt>
      <dd
        className="font-data font-medium text-right"
        style={{
          color: gold ? "var(--gold)" : gain ? "var(--gain)" : undefined,
        }}
      >
        {value}
      </dd>
    </>
  );
}
