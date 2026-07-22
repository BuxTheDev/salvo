"use client";

import {
  Check,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Mail,
  Search,
  Send,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DEMO_PROPERTIES } from "@/lib/demo-data";
import { buildExportRecords, exportColumns, toCsv } from "@/lib/engine/export";
import { compactMoney } from "@/lib/engine/format";
import {
  contactFor,
  isReachable,
  isReady,
  sortValue,
  underwrite,
} from "@/lib/engine/underwrite";
import {
  DEFAULT_SETTINGS,
  OfferMode,
  Property,
  Settings,
  Target,
} from "@/lib/engine/types";

interface ConsoleRow {
  property: Property;
  result: ReturnType<typeof underwrite>;
  contact: ReturnType<typeof contactFor>;
  reachable: boolean;
  duplicateCount: number;
}

function Segment<T extends string>({
  value,
  onChange,
  options,
  tone,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  tone: "steel" | "orange";
}) {
  return (
    <div className={`segment ${tone}`}>
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SettingInput({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <div><input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /><b>{suffix}</b></div>
    </label>
  );
}

export function OffersConsole() {
  const [properties, setProperties] = useState<Property[]>(DEMO_PROPERTIES);
  const [source, setSource] = useState("phoenix-propstream-demo.csv");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [target, setTarget] = useState<Target>("agent");
  const [mode, setMode] = useState<OfferMode>("both");
  const [reachableOnly, setReachableOnly] = useState(true);
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(DEMO_PROPERTIES.map((item) => item.id ?? item.address)),
  );
  const [toast, setToast] = useState("");

  useEffect(() => {
    const loadStoredImport = window.setTimeout(() => {
      const stored = localStorage.getItem("salvo-properties");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Property[];
          if (parsed.length) {
            setProperties(parsed);
            setSelected(new Set(parsed.map((item) => item.id ?? item.address)));
          }
        } catch {
          localStorage.removeItem("salvo-properties");
        }
      }
      setSource(localStorage.getItem("salvo-source") ?? "phoenix-propstream-demo.csv");
    }, 0);
    return () => window.clearTimeout(loadStoredImport);
  }, []);

  const rows = useMemo<ConsoleRow[]>(() => {
    const firstPass = properties
      .map((property) => {
        const result = underwrite(property, settings);
        const contact = contactFor(property, target);
        return { property, result, contact, reachable: isReachable(contact), duplicateCount: 1 };
      })
      .filter((row) => isReady(row.result, mode));
    const counts = new Map<string, number>();
    for (const row of firstPass) {
      const key = row.contact.email?.toLowerCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return firstPass
      .map((row) => ({
        ...row,
        duplicateCount: row.contact.email ? (counts.get(row.contact.email.toLowerCase()) ?? 1) : 1,
      }))
      .sort((a, b) => sortValue(b.result, mode) - sortValue(a.result, mode));
  }, [properties, settings, target, mode]);

  const visibleRows = useMemo(() => rows.filter((row) => {
    if (reachableOnly && !row.reachable) return false;
    const text = `${row.property.address} ${row.property.city ?? ""} ${row.contact.name ?? ""} ${row.contact.email ?? ""}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [rows, reachableOnly, query]);

  const selectedRows = rows.filter(
    (row) =>
      selected.has(row.property.id ?? row.property.address) &&
      (!reachableOnly || row.reachable),
  );
  const creativeCount = rows.filter((row) => row.result.creative_ok).length;
  const cashCount = rows.filter((row) => row.result.cash_ok).length;
  const reachableCount = rows.filter((row) => row.reachable).length;
  const totalDifference = rows.reduce((sum, row) => sum + (row.result.creative_ok ? (row.result.diff ?? 0) : 0), 0);

  function patchSetting(key: keyof Settings, value: number) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function toggleRow(row: ConsoleRow) {
    const key = row.property.id ?? row.property.address;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    const keys = visibleRows.map((row) => row.property.id ?? row.property.address);
    const allSelected = keys.every((key) => selected.has(key));
    setSelected((current) => {
      const next = new Set(current);
      keys.forEach((key) => allSelected ? next.delete(key) : next.add(key));
      return next;
    });
  }

  function downloadCsv() {
    const exportRows = selectedRows.map((row) => ({ property: row.property, result: row.result }));
    const records = buildExportRecords(exportRows, settings, mode, target);
    const blob = new Blob([toCsv(records, exportColumns(mode))], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `salvo-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setToast(`${records.length} offers exported for GHL`);
    window.setTimeout(() => setToast(""), 2600);
  }

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selected.has(row.property.id ?? row.property.address));

  return (
    <div className="page offer-page">
      <div className="page-heading offer-heading">
        <div>
          <div className="eyebrow">02 / Aim the offer</div>
          <h1 className="page-title">Offer console</h1>
          <p className="page-subtitle">{source} · {properties.length.toLocaleString()} properties loaded</p>
        </div>
        <button className="btn" onClick={() => setSettingsOpen((open) => !open)}>
          <SlidersHorizontal size={14} /> Underwriting settings <ChevronDown size={13} />
        </button>
      </div>

      <div className="control-deck panel">
        <div className="axis-group steel-axis">
          <label><i /> TARGET</label>
          <Segment
            value={target}
            onChange={setTarget}
            tone="steel"
            options={[{ value: "agent", label: "Listing agent" }, { value: "seller", label: "Property owner" }]}
          />
        </div>
        <div className="deck-divider" />
        <div className="axis-group orange-axis">
          <label><i /> OFFER</label>
          <Segment
            value={mode}
            onChange={setMode}
            tone="orange"
            options={[{ value: "creative", label: "Creative" }, { value: "cash", label: "Cash" }, { value: "both", label: "Both" }]}
          />
        </div>
        <div className="deck-spacer" />
        <div className="ready-copy"><span className="status-dot" /><div><strong>{rows.length} offer-ready</strong><small>live underwriting</small></div></div>
      </div>

      {settingsOpen && (
        <div className="settings-strip panel">
          <div className="settings-label"><SlidersHorizontal size={15} /><div><strong>Deal rules</strong><small>Changes recalculate instantly</small></div></div>
          <SettingInput label="Down" suffix="%" value={settings.downPct} onChange={(value) => patchSetting("downPct", value)} />
          <SettingInput label="Down cap" suffix="$" value={settings.downCap} onChange={(value) => patchSetting("downCap", value)} />
          <SettingInput label="Term" suffix="mo" value={settings.amortMonths} onChange={(value) => patchSetting("amortMonths", value)} />
          <SettingInput label="Tolerance" suffix="$" value={settings.tolerance} onChange={(value) => patchSetting("tolerance", value)} />
          <SettingInput label="Cash" suffix="%" value={settings.cashPct} onChange={(value) => patchSetting("cashPct", value)} />
          <button className="reset-link" onClick={() => setSettings(DEFAULT_SETTINGS)}>Reset</button>
        </div>
      )}

      <div className="stat-strip">
        <div><span><Zap size={14} /> QUALIFIED</span><strong>{rows.length}</strong><small>of {properties.length} properties</small></div>
        <div><span><Mail size={14} /> REACHABLE</span><strong>{reachableCount}</strong><small>{rows.length ? Math.round(reachableCount / rows.length * 100) : 0}% contactable</small></div>
        <div><span>CR</span><strong>{creativeCount}</strong><small>creative offers</small></div>
        <div><span>CA</span><strong>{cashCount}</strong><small>cash offers</small></div>
        <div className="difference-stat"><span>SELLER FINANCE DIFFERENCE</span><strong>{compactMoney(totalDifference)}</strong><small>total seller upside</small></div>
      </div>

      <section className="results panel">
        <div className="results-toolbar">
          <div>
            <h3 className="panel-title">Qualified properties</h3>
            <span className="panel-kicker">Sorted by strongest {mode === "cash" ? "net cash" : "seller outcome"}</span>
          </div>
          <div className="table-tools">
            <label className="search-box"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search list" />{query && <button onClick={() => setQuery("")}><X size={11} /></button>}</label>
            <button className={`filter-btn ${reachableOnly ? "active" : ""}`} onClick={() => setReachableOnly((value) => !value)}><Filter size={12} /> Reachable only</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="offer-table">
            <thead>
              <tr>
                <th className="check-col"><button className={`check ${allVisibleSelected ? "checked" : ""}`} onClick={toggleAll}>{allVisibleSelected && <Check size={10} />}</button></th>
                <th>Property / contact</th>
                {mode === "creative" && <><th>Rent vs payment</th><th>Down</th><th className="accent-col">SF difference</th></>}
                {mode === "cash" && <><th>Home value</th><th>Cash offer</th><th className="accent-col">Net cash</th></>}
                {mode === "both" && <><th>SF difference</th><th>Net cash</th><th>Offers</th></>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const key = row.property.id ?? row.property.address;
                const isSelected = selected.has(key);
                return (
                  <tr key={key} className={isSelected ? "selected" : ""}>
                    <td className="check-col"><button className={`check ${isSelected ? "checked" : ""}`} onClick={() => toggleRow(row)}>{isSelected && <Check size={10} />}</button></td>
                    <td>
                      <div className="property-cell">
                        <div className="house-mark">{row.property.address.trim().charAt(0)}</div>
                        <div>
                          <strong>{row.property.address}</strong>
                          <small>{[row.property.city, row.property.state, row.property.zip].filter(Boolean).join(", ")}</small>
                          <span>{row.contact.name || "No contact name"} {row.duplicateCount > 1 && <b className="dup-badge">×{row.duplicateCount}</b>}</span>
                        </div>
                      </div>
                    </td>
                    {mode === "creative" && <>
                      <td><div className="money-stack"><strong>{compactMoney(row.property.monthly_rent)}</strong><small>rent · {compactMoney(row.result.total)} pmt</small></div></td>
                      <td className="mono money">{compactMoney(row.result.down)}</td>
                      <td className="mono money gain">+{compactMoney(row.result.diff)}</td>
                    </>}
                    {mode === "cash" && <>
                      <td className="mono money">{compactMoney(row.result.home_value)}</td>
                      <td className="mono money">{compactMoney(row.result.cash)}</td>
                      <td className="mono money gain">{compactMoney(row.result.net_cash)}</td>
                    </>}
                    {mode === "both" && <>
                      <td className={`mono money ${row.result.creative_ok ? "gain" : "muted"}`}>{row.result.creative_ok ? `+${compactMoney(row.result.diff)}` : "—"}</td>
                      <td className={`mono money ${row.result.cash_ok ? "" : "muted"}`}>{row.result.cash_ok ? compactMoney(row.result.net_cash) : "—"}</td>
                      <td><div className="offer-badges">{row.result.creative_ok && <b className="cr">CR</b>}{row.result.cash_ok && <b className="ca">CA</b>}</div></td>
                    </>}
                    <td>
                      <div className="status-stack">
                        {row.reachable ? <span className="badge badge-green"><span className="tiny-dot" /> ready</span> : <span className="badge">no contact</span>}
                        {row.contact.dnc && !row.contact.email && <span className="badge badge-red">DNC</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleRows.length && <tr><td colSpan={7} className="empty-table">No properties match the current filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Showing {visibleRows.length} of {rows.length} qualified properties</span>
          <span><b>{selectedRows.length}</b> selected</span>
        </div>
      </section>

      <div className="blast-bar">
        <div className="blast-summary"><div className="blast-icon"><Send size={18} /></div><div><strong>{selectedRows.length} offers armed</strong><small>{target === "agent" ? "Direct-to-Agent" : "Direct-to-Seller"} · {mode === "both" ? "Cash + Creative" : mode}</small></div></div>
        <div className="blast-actions">
          <button className="btn pdf-disabled" disabled title="PDF generation is the next build phase"><FileText size={14} /> Generate PDFs</button>
          <button className="btn btn-primary" disabled={!selectedRows.length} onClick={downloadCsv}><Download size={14} /> Export GHL CSV</button>
        </div>
      </div>
      {toast && <div className="toast"><Check size={14} /> {toast}</div>}
    </div>
  );
}
