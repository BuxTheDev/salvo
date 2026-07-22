import React, { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import {
  SEED, SPEC, FIELD_ORDER, autoMap, fileReport, normalizeWithMap, enrich, keyOf,
  underwrite, contactFor, usd, usdk, mean, fmtPhone,
  TARGETS, OFFERS, TARGET_LABEL, DEFAULTS, buildExportRow, toCSV,
} from "./lib/engine.js";

/* =========================================================================
   SALVO — fire the whole list.
   Universal import (any CSV → required fields, flags what's missing) ·
   skip-trace enrichment · contactability + DNC · duplicate-contact flags ·
   Target × Offer modes · GHL-mapped CSV export.
   The pure engine (mapper/underwrite/format/export) lives in ./lib/engine.js
   so it is shared with the batch PDF/CSV pipeline (scripts/render_lois.jsx).
   ========================================================================= */

function download(text, name) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export default function Salvo() {
  const [raw, setRaw] = useState(SEED);
  const [mapping, setMapping] = useState(() => autoMap(Object.keys(SEED[0])));
  const [headers, setHeaders] = useState(Object.keys(SEED[0]));
  const [fileName, setFileName] = useState(null);
  const [enrichRows, setEnrichRows] = useState(null);
  const [enrichName, setEnrichName] = useState(null);
  const [showMapper, setShowMapper] = useState(false);
  const [target, setTarget] = useState("agent");
  const [offer, setOffer] = useState("creative");
  const [reachableOnly, setReachableOnly] = useState(false);
  const [s, setS] = useState(DEFAULTS);
  const [sel, setSel] = useState(() => new Set());
  const [showBlast, setShowBlast] = useState(false);
  const [note, setNote] = useState(null);
  const fileRef = useRef(); const enrichRef = useRef();
  const setKey = (k, v) => setS((p) => ({ ...p, [k]: v }));

  const report = useMemo(() => fileReport(mapping), [mapping]);
  const norm = useMemo(() => {
    let base = normalizeWithMap(raw, mapping);
    if (enrichRows) base = enrich(base, normalizeWithMap(enrichRows, autoMap(Object.keys(enrichRows[0] || {}))));
    return base;
  }, [raw, mapping, enrichRows]);

  const [who, off] = [target, offer];
  const scored = useMemo(() => {
    const rows = norm.map((r) => {
      const u = underwrite(r, s);
      const creativeOK = u.creative_ok, cashOK = u.cash_ok;
      const ready = off === "creative" ? creativeOK : off === "cash" ? cashOK : creativeOK || cashOK;
      const contact = contactFor(r, who);
      const sortVal = off === "cash" ? (u.net_cash || 0) : off === "creative" ? (u.diff || 0) : Math.max(creativeOK ? u.diff : -1e9, cashOK ? u.net_cash : -1e9);
      return { r, u, creativeOK, cashOK, ready, contact, sortVal };
    });
    const counts = new Map();
    rows.forEach((x) => { if (x.ready && x.contact.email) { const k = keyOf(x.contact.email); counts.set(k, (counts.get(k) || 0) + 1); } });
    rows.forEach((x) => { x.dup = x.contact.email ? counts.get(keyOf(x.contact.email)) || 1 : 1; });
    return rows.sort((a, b) => (b.ready - a.ready) || (b.sortVal - a.sortVal));
  }, [norm, s, who, off]);

  const reachable = (x) => !!(x.contact.email || (x.contact.phone && !(x.r.owner_dnc && !x.contact.viaAgent)));
  const ready = scored.filter((x) => x.ready && (!reachableOnly || reachable(x)));
  const reachCount = scored.filter((x) => x.ready && reachable(x)).length;
  const dupContacts = new Set(scored.filter((x) => x.ready && x.dup > 1 && x.contact.email).map((x) => keyOf(x.contact.email))).size;
  const avg = off === "cash" ? mean(ready.map((x) => x.u.net_cash)) : off === "creative" ? mean(ready.map((x) => x.u.diff)) : mean(ready.map((x) => (x.creativeOK ? x.u.diff : x.u.net_cash)));

  const parseFile = (f, setter, nameSetter, isBase) => {
    Papa.parse(f, { header: true, skipEmptyLines: true, complete: (res) => {
      const rows = res.data.filter((r) => Object.values(r).some((v) => v !== "" && v != null));
      if (isBase) { setRaw(rows); setHeaders(Object.keys(rows[0] || {})); setMapping(autoMap(Object.keys(rows[0] || {}))); setSel(new Set()); setNote(null); setShowMapper(true); }
      else { setter(rows); }
      nameSetter(f.name);
    } });
  };
  const onFile = (f) => f && parseFile(f, null, setFileName, true);
  const onEnrich = (f) => f && parseFile(f, setEnrichRows, setEnrichName, false);
  const setMap = (field, header) => setMapping((m) => { const n = { ...m }; if (!header) delete n[field]; else n[field] = { header, how: "manual" }; return n; });

  const toggle = (a) => setSel((p) => { const n = new Set(p); n.has(a) ? n.delete(a) : n.add(a); return n; });
  const selectAll = () => setSel(new Set(ready.map((x) => x.r.address)));
  const clearSel = () => setSel(new Set());
  const doBlast = () => {
    const rows = scored.filter((x) => sel.has(x.r.address) && x.ready).map((x) => buildExportRow(x, target, offer, x.dup));
    if (!rows.length) return;
    download(toCSV(rows), `salvo_${target}_${offer}_${rows.length}.csv`);
    setNote(`Exported ${rows.length}-row CSV — ${OFFERS[offer]} · ${TARGET_LABEL[target]}. Import to GHL, map columns to custom fields, fire the "Offer Ready" workflow.`);
  };
  const firstSel = scored.find((x) => sel.has(x.r.address) && x.ready);
  const bothMode = off === "both";
  const KIND = { base: ["Ready to blast", "gain"], enrichment: ["Skip-trace / enrichment file", "warn"], incomplete: ["Missing required data", "loss"] };

  return (
    <div className="sv">
      <style>{css}</style>

      <header className="sv-head">
        <div className="sv-brand"><RocketMark size={26} /><span className="sv-name">SALVO</span><span className="sv-tag">fire the whole list</span></div>
        <label className="sv-upload"><input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => onFile(e.target.files[0])} /><span onClick={() => fileRef.current?.click()}>{fileName ? "↻ Replace list" : "⬆ Upload list"}</span></label>
      </header>

      {/* import status */}
      <div className="sv-import">
        <div className="sv-import-top">
          <div className="sv-src">
            <span className={`sv-kind ${KIND[report.kind][1]}`}>{KIND[report.kind][0]}</span>
            <span className="sv-src-txt">{fileName ? <b>{fileName}</b> : "Sample list"} · {norm.length} rows · {Object.keys(mapping).length}/{FIELD_ORDER.length} fields mapped</span>
          </div>
          <button className="sv-link" onClick={() => setShowMapper((v) => !v)}>{showMapper ? "Hide mapping" : "Review mapping"}</button>
        </div>
        {report.missing.length > 0 && (
          <div className="sv-missing">⚠ Missing required: {report.missing.map((f) => SPEC[f].label).join(", ")}. {report.kind === "enrichment" ? "Looks like a skip-trace list — upload a base list, then add this as enrichment below." : "Map it below or upload a complete list."}</div>
        )}
        {showMapper && (
          <div className="sv-map">
            <div className="sv-map-grid">
              {FIELD_ORDER.map((f) => {
                const ownerFullDerived = f === "owner_full" && !mapping.owner_full && !!(mapping.owner_first || mapping.owner_last);
                return (
                <label key={f} className={`sv-mf ${SPEC[f].req && !mapping[f] ? "req-miss" : ""}`}>
                  <span className="sv-mf-l">{SPEC[f].label}{SPEC[f].req && <b className="req">*</b>}</span>
                  <select value={mapping[f]?.header || ""} onChange={(e) => setMap(f, e.target.value)}>
                    <option value="">{ownerFullDerived ? "— first + last —" : "— none —"}</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {mapping[f] && <span className={`sv-how ${mapping[f].how}`}>{mapping[f].how === "manual" ? "set" : mapping[f].how === "exact" ? "auto" : "guess"}</span>}
                  {ownerFullDerived && <span className="sv-how combined" title="Owner full name is combined from owner first + last name">combined</span>}
                </label>
                );
              })}
            </div>
            <label className="sv-enrich">
              <input ref={enrichRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => onEnrich(e.target.files[0])} />
              <button className="sv-link2" onClick={() => enrichRef.current?.click()}>+ Add skip-trace / phone list</button>
              {enrichName && <span className="sv-enrich-n">enriching from <b>{enrichName}</b></span>}
            </label>
          </div>
        )}
      </div>

      {/* mode bar */}
      <div className="sv-bar">
        <div className="sv-controls">
          <div className="sv-seg seg-target"><span className="sv-seglbl">Target</span>{Object.keys(TARGETS).map((t) => <button key={t} className={target === t ? "on" : ""} onClick={() => setTarget(t)}>{TARGETS[t]}</button>)}</div>
          <div className="sv-seg seg-offer"><span className="sv-seglbl">Offer</span>{Object.keys(OFFERS).map((o) => <button key={o} className={offer === o ? "on" : ""} onClick={() => { setOffer(o); setSel(new Set()); }}>{OFFERS[o]}</button>)}</div>
        </div>
        <label className="sv-reach"><input type="checkbox" checked={reachableOnly} onChange={(e) => setReachableOnly(e.target.checked)} />Reachable only</label>
      </div>

      <div className="sv-stats">
        <Stat n={norm.length} l="Scanned" />
        <Stat n={ready.length} l={`${OFFERS[offer]} ready`} tone="gain" />
        <Stat n={reachCount} l="reachable contact" tone={target === "seller" ? "gold" : "steel"} />
        <Stat n={dupContacts} l="shared contacts" tone="steel" />
        <Stat n={usdk(avg)} l={off === "cash" ? "avg net cash" : "avg seller upside"} tone="gold" wide />
      </div>

      <div className="sv-body">
        <aside className="sv-settings">
          <h3 className="sv-h">Terms</h3>
          <Slider label="Down = % of equity" v={s.downPct} set={(v) => setKey("downPct", v)} min={0} max={100} step={5} unit="%" />
          <Slider label="Down cap" v={s.downCap} set={(v) => setKey("downCap", v)} min={0} max={60000} step={2500} fmt={usd} />
          <Slider label="Amortization" v={s.amortMonths} set={(v) => setKey("amortMonths", v)} min={120} max={480} step={12} fmt={(v) => `${v / 12}yr`} />
          <Slider label="Payment tolerance" v={s.tolerance} set={(v) => setKey("tolerance", v)} min={0} max={800} step={50} fmt={(v) => `rent+$${v}`} />
          <Slider label="Selling cost" v={s.sellingPct} set={(v) => setKey("sellingPct", v)} min={6} max={15} step={0.5} unit="%" />
          <Slider label="Cash offer" v={s.cashPct} set={(v) => setKey("cashPct", v)} min={60} max={95} step={1} unit="%" />
          <label className="sv-toggle"><input type="checkbox" checked={s.requirePositiveFinanced} onChange={(e) => setKey("requirePositiveFinanced", e.target.checked)} />Skip degenerate creatives</label>
          <label className="sv-toggle"><input type="checkbox" checked={s.requireCashClears} onChange={(e) => setKey("requireCashClears", e.target.checked)} />Cash must clear the loan</label>
          <label className="sv-toggle"><input type="checkbox" checked={s.requireKnownLoan} onChange={(e) => setKey("requireKnownLoan", e.target.checked)} />Cash needs known loan balance</label>
        </aside>

        <main className="sv-list">
          <div className="sv-toolbar">
            <div><button className="sv-btn ghost" onClick={selectAll}>Select all ready</button><button className="sv-btn ghost" onClick={clearSel}>Clear</button><button className="sv-btn ghost" onClick={() => setShowBlast((v) => !v)} disabled={!sel.size}>{showBlast ? "Hide mapping" : "Preview mapping"}</button></div>
            <button className="sv-btn primary" disabled={!sel.size} onClick={doBlast}>⬇ Blast {sel.size} → CSV</button>
          </div>
          {note && <div className="sv-note">{note}</div>}
          <div className="sv-tablewrap">
            <table className="sv-table">
              <thead>
                {off === "creative" ? (<tr><th></th><th className="l">Property / {TARGETS[target]}</th><th>Rent vs Pmt</th><th>Down</th><th className="hook">SF Difference</th><th>Status</th></tr>)
                : off === "cash" ? (<tr><th></th><th className="l">Property / {TARGETS[target]}</th><th>Cash Offer</th><th className="hook">Net Cash</th><th>Saved</th><th>Status</th></tr>)
                : (<tr><th></th><th className="l">Property / {TARGETS[target]}</th><th className="hook">SF Difference</th><th className="hook">Net Cash</th><th>Offers</th><th>Status</th></tr>)}
              </thead>
              <tbody>
                {scored.map(({ r, u, creativeOK, cashOK, ready: ok, contact, dup }) => {
                  const hidden = reachableOnly && ok && !reachable({ r, contact });
                  if (hidden) return null;
                  const dncFlag = !contact.viaAgent && r.owner_dnc && !contact.email;
                  return (
                    <tr key={r.address} className={`${sel.has(r.address) ? "on" : ""} ${ok ? "" : "dim"}`}>
                      <td><input type="checkbox" aria-label={`Select ${r.address}`} disabled={!ok} checked={sel.has(r.address)} onChange={() => toggle(r.address)} /></td>
                      <td className="l">
                        <div className="sv-addr">{r.address} <span className="sv-city">{r.city}{r.city && r.state ? ", " : ""}{r.state}</span>
                          {dup > 1 && <span className="sv-dup" title="same contact on multiple listings">×{dup}</span>}
                          {dncFlag && <span className="sv-dnc">DNC</span>}
                        </div>
                        <div className="sv-contact">{contact.name || "no contact"}{contact.viaAgent && target === "seller" ? " (agent fallback)" : ""}{contact.email ? ` · ${contact.email}` : contact.phone ? ` · ${fmtPhone(contact.phone)}` : " · no contact"}</div>
                      </td>
                      {off === "creative" && (<><td><span className={creativeOK ? "gain" : "loss"}>{isNaN(r.monthly_rent) ? "—" : usd(r.monthly_rent)}</span><span className="mut"> / {usd(u.total)}</span></td><td>{isNaN(u.down) ? <span className="warn">TBD</span> : usd(u.down)}</td><td className="hook">{u.diff > 0 ? usd(u.diff) : "—"}</td></>)}
                      {off === "cash" && (<><td>{usd(u.cash)}</td><td className={`hook ${u.net_cash < 0 ? "loss" : ""}`}>{usd(u.net_cash)}</td><td>{usd(u.industry_costs)}</td></>)}
                      {bothMode && (<><td className="hook">{creativeOK && u.diff > 0 ? usd(u.diff) : "—"}</td><td className={`hook ${u.net_cash < 0 ? "loss" : ""}`}>{cashOK ? usd(u.net_cash) : "—"}</td><td className="sv-offers"><span className={`ob ${creativeOK ? "on" : ""}`}>CR</span><span className={`ob ${cashOK ? "on" : ""}`}>CA</span></td></>)}
                      <td><span className={`chip ${ok ? "ok" : "no"}`}>{ok ? "READY" : "SKIP"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {norm.length === 0 && (
            <div className="sv-empty">No rows to show yet. Upload a CSV list (PropStream, PropWire, BatchLeads, or any CSV) to start firing offers.</div>
          )}
          {norm.length > 0 && ready.length === 0 && (
            <div className="sv-empty">No {OFFERS[offer]} offers are ready under the current terms{reachableOnly ? " with a reachable contact" : ""}. Loosen the settings on the left or switch the offer type.</div>
          )}
          {firstSel && (off === "creative" || (bothMode && firstSel.creativeOK)) && (
            <div className="sv-pitch"><span className="sv-pitch-lbl">LOI hook · {firstSel.r.address}</span>Selling creatively nets {firstSel.r.owner_full || "the seller"} {usd(firstSel.u.diff)} more than a traditional sale — {usd(firstSel.u.net_crea)} vs {usd(firstSel.u.net_trad)} after {s.sellingPct}% costs.</div>
          )}
          {showBlast && firstSel && (
            <div className="sv-payload"><div className="sv-payload-cap">Column map · {OFFERS[offer]} · exactly the merge tags this LOI needs, all populated{offer === "cash" ? " (cash omits creative fields)" : " · includes the cash-page fields"}</div><pre>{JSON.stringify(buildExportRow(firstSel, target, offer, firstSel.dup), null, 2)}</pre></div>
          )}
        </main>
      </div>
    </div>
  );
}

function RocketMark({ size = 24 }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ display: "block", flex: "0 0 auto" }} aria-label="Salvo logo">
      <path d="M37.1 90.8 A40 40 0 1 1 82.9 90.8" fill="none" stroke="#e86a2a" strokeWidth="10" strokeLinecap="round" />
      <g transform="rotate(18 60 60)">
        <polygon points="55,74 65,74 70,101 50,101" fill="#8fa0b0" />
        <path d="M60 22 C 69 22 69 46 66 62 C 64 72 62 78 60 78 C 58 78 56 72 54 62 C 51 46 51 22 60 22 Z" fill="#eceae4" />
        <polygon points="54,60 47,79 54,73" fill="#eceae4" /><polygon points="66,60 73,79 66,73" fill="#eceae4" />
        <polygon points="60,32 66,45 60,41 54,45" fill="#e86a2a" />
      </g>
    </svg>
  );
}
function Stat({ n, l, tone = "", wide }) { return (<div className={`sv-stat ${wide ? "wide" : ""}`}><div className={`sv-stat-n ${tone}`}>{n}</div><div className="sv-stat-l">{l}</div></div>); }
function Slider({ label, v, set, min, max, step, unit = "", fmt }) { return (<div className="sv-slider"><div className="sv-slider-top"><span>{label}</span><span className="sv-slider-val">{fmt ? fmt(v) : `${v}${unit}`}</span></div><input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(parseFloat(e.target.value))} /></div>); }

const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.sv{ --ink:#161c22; --ink-2:#5a6672; --canvas:#e9ecf0; --panel:#fff; --line:#dde2e8;
  --gain:#0f7a52; --loss:#c0392b; --warn:#c08a2d; --gold:#e86a2a; --gold-soft:#fdeadf; --steel:#356886;
  --radius:14px; --shadow:0 1px 2px rgba(20,30,40,.05), 0 1px 3px rgba(20,30,40,.04); --shadow-lg:0 16px 46px rgba(18,26,34,.13);
  font-family:'Space Grotesk',ui-sans-serif,system-ui,sans-serif; color:var(--ink); accent-color:var(--gold);
  background:linear-gradient(180deg,#eef1f4,#e5e9ee); padding:22px; border-radius:20px; max-width:1200px; margin:0 auto; box-shadow:var(--shadow-lg); }
.sv *{ box-sizing:border-box; }
.sv :focus-visible{ outline:2px solid var(--steel); outline-offset:2px; border-radius:6px; }
.sv input[type=checkbox]{ width:15px; height:15px; cursor:pointer; accent-color:var(--gold); }
.sv input[type=checkbox]:disabled{ cursor:not-allowed; opacity:.4; }
.sv .sv-h{ font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-2); margin:0 0 14px; font-weight:600; }
.gain{color:var(--gain);} .loss{color:var(--loss);} .warn{color:var(--warn);} .mut{color:var(--ink-2);}
.sv-head{ display:flex; align-items:center; justify-content:space-between; background:linear-gradient(180deg,#232c34,#161c22); color:#fff; padding:15px 22px; border-radius:14px; margin-bottom:16px; border-bottom:2px solid var(--gold); box-shadow:0 4px 14px rgba(20,28,36,.18); }
.sv-brand{ display:flex; align-items:center; gap:11px; }
.sv-name{ font-weight:700; letter-spacing:.22em; font-size:19px; }
.sv-tag{ font-size:12px; color:#93a4b4; font-style:italic; padding-left:11px; margin-left:4px; border-left:1px solid rgba(255,255,255,.15); }
.sv-upload span{ cursor:pointer; background:var(--gold); color:#2a1206; padding:9px 15px; border-radius:9px; font-size:12.5px; font-weight:600; display:inline-block; box-shadow:0 2px 8px rgba(232,106,42,.35); transition:transform .12s, box-shadow .12s, filter .12s; }
.sv-upload span:hover{ filter:brightness(1.05); transform:translateY(-1px); box-shadow:0 4px 14px rgba(232,106,42,.45); }
.sv-upload span:active{ transform:translateY(0); }

.sv-import{ background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:13px 16px; margin-bottom:12px; box-shadow:var(--shadow); }
.sv-import-top{ display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
.sv-src{ display:flex; align-items:center; gap:10px; font-size:12.5px; color:var(--ink-2); } .sv-src b{ color:var(--ink); }
.sv-kind{ font-size:10px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; padding:3px 10px; border-radius:20px; }
.sv-kind.gain{ background:#e3f3ec; color:var(--gain); } .sv-kind.warn{ background:var(--gold-soft); color:#b3560f; } .sv-kind.loss{ background:#fbe6e3; color:var(--loss); }
.sv-link{ background:none; border:none; color:var(--steel); font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; text-decoration:underline; text-underline-offset:2px; padding:2px 4px; border-radius:6px; }
.sv-link:hover{ color:#24485f; }
.sv-missing{ margin-top:10px; background:#fdf4e7; border:1px solid #f0dcb8; color:#8a5a12; border-radius:9px; padding:9px 12px; font-size:12px; line-height:1.5; }
.sv-map{ margin-top:12px; border-top:1px solid var(--line); padding-top:13px; }
.sv-map-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(215px,1fr)); gap:10px 14px; }
.sv-mf{ display:flex; flex-direction:column; gap:3px; font-size:11px; position:relative; }
.sv-mf-l{ color:var(--ink-2); font-weight:500; } .sv-mf-l .req{ color:var(--gold); margin-left:2px; }
.sv-mf select{ font-family:inherit; font-size:11.5px; padding:6px 8px; border:1px solid var(--line); border-radius:7px; background:#fbfcfd; color:var(--ink); transition:border-color .12s; }
.sv-mf select:hover{ border-color:#c2c9d1; }
.sv-mf.req-miss select{ border-color:var(--loss); background:#fdf0ef; }
.sv-how{ position:absolute; right:6px; top:24px; font-size:8.5px; letter-spacing:.04em; text-transform:uppercase; font-weight:700; padding:1px 5px; border-radius:8px; pointer-events:none; }
.sv-how.exact{ background:#e3f3ec; color:var(--gain); } .sv-how.fuzzy{ background:var(--gold-soft); color:#b3560f; } .sv-how.manual{ background:#e8eef4; color:var(--steel); } .sv-how.combined{ background:#e8eef4; color:var(--steel); }
.sv-enrich{ display:flex; align-items:center; gap:10px; margin-top:13px; }
.sv-link2{ background:#f2f4f6; border:1px dashed var(--line); color:var(--steel); font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; padding:8px 13px; border-radius:8px; transition:background .12s, border-color .12s; }
.sv-link2:hover{ background:#e9edf1; border-color:#c2c9d1; }
.sv-enrich-n{ font-size:11.5px; color:var(--ink-2); } .sv-enrich-n b{ color:var(--ink); }

.sv-bar{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; flex-wrap:wrap; }
.sv-controls{ display:flex; gap:12px; flex-wrap:wrap; }
.sv-seg{ display:flex; align-items:center; gap:3px; background:#eef1f4; border:1px solid var(--line); border-radius:12px; padding:4px 5px; box-shadow:inset 0 1px 2px rgba(20,30,40,.04); }
.sv-seglbl{ display:flex; align-items:center; gap:6px; font-size:9.5px; letter-spacing:.13em; text-transform:uppercase; font-weight:700; padding:0 10px; }
.sv-seglbl::before{ content:""; width:7px; height:7px; border-radius:50%; }
.sv-seg button{ border:none; background:transparent; color:var(--ink-2); padding:8px 14px; border-radius:9px; font-family:inherit; font-size:12.5px; font-weight:500; cursor:pointer; transition:background .14s,color .14s,box-shadow .14s,transform .1s; }
.sv-seg button:hover{ background:#e2e6eb; color:var(--ink); }
.sv-seg button:active{ transform:scale(.97); }
.seg-target .sv-seglbl{ color:#2f6483; } .seg-target .sv-seglbl::before{ background:#3d6f8f; }
.seg-target button.on,.seg-target button.on:hover{ background:#356886; color:#fff; box-shadow:0 2px 6px rgba(28,60,80,.32); }
.seg-offer .sv-seglbl{ color:#c2531a; } .seg-offer .sv-seglbl::before{ background:#e86a2a; }
.seg-offer button.on,.seg-offer button.on:hover{ background:#e86a2a; color:#2a1206; box-shadow:0 2px 6px rgba(180,80,30,.34); }
.sv-reach{ display:flex; align-items:center; gap:7px; font-size:12px; color:var(--ink-2); background:var(--panel); border:1px solid var(--line); padding:8px 13px; border-radius:10px; box-shadow:var(--shadow); cursor:pointer; }

.sv-stats{ display:grid; grid-template-columns:repeat(4,1fr) 1.3fr; gap:11px; margin-bottom:12px; }
.sv-stat{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px 16px; box-shadow:var(--shadow); transition:transform .12s, box-shadow .12s; }
.sv-stat:hover{ transform:translateY(-2px); box-shadow:0 6px 18px rgba(20,30,40,.09); }
.sv-stat.wide{ background:linear-gradient(180deg,#232c34,#161c22); border-color:var(--ink); }
.sv-stat-n{ font-family:'IBM Plex Mono',monospace; font-size:24px; font-weight:600; line-height:1; letter-spacing:-.01em; }
.sv-stat-n.gain{color:var(--gain);} .sv-stat-n.gold{color:var(--gold);} .sv-stat-n.steel{color:var(--steel);} .sv-stat.wide .sv-stat-n.gold{color:#f4cf74;}
.sv-stat-l{ font-size:10.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--ink-2); margin-top:6px; } .sv-stat.wide .sv-stat-l{ color:#9fb0c0; }

.sv-body{ display:grid; grid-template-columns:236px 1fr; gap:12px; align-items:start; }
.sv-settings{ background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:18px; box-shadow:var(--shadow); position:sticky; top:14px; }
.sv-slider{ margin-bottom:15px; } .sv-slider-top{ display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:6px; } .sv-slider-top span:first-child{ color:var(--ink-2); }
.sv-slider-val{ font-family:'IBM Plex Mono',monospace; font-weight:600; color:var(--ink); }
.sv-slider input[type=range]{ width:100%; -webkit-appearance:none; appearance:none; height:5px; background:var(--line); border-radius:5px; accent-color:var(--gold); cursor:pointer; }
.sv-slider input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:16px; height:16px; border-radius:50%; background:var(--gold); border:3px solid #fff; box-shadow:0 1px 3px rgba(20,30,40,.25); cursor:pointer; transition:transform .1s; }
.sv-slider input[type=range]::-webkit-slider-thumb:hover{ transform:scale(1.12); }
.sv-slider input[type=range]::-moz-range-thumb{ width:16px; height:16px; border-radius:50%; background:var(--gold); border:3px solid #fff; box-shadow:0 1px 3px rgba(20,30,40,.25); cursor:pointer; }
.sv-toggle{ display:flex; align-items:center; gap:8px; font-size:11.5px; color:var(--ink-2); margin-top:11px; cursor:pointer; }

.sv-list{ background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:16px 18px; box-shadow:var(--shadow); }
.sv-toolbar{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:8px; flex-wrap:wrap; }
.sv-btn{ font-family:inherit; font-size:12.5px; font-weight:500; border-radius:9px; padding:8px 14px; cursor:pointer; border:1px solid var(--line); transition:background .12s, border-color .12s, transform .1s, box-shadow .12s, filter .12s; }
.sv-btn:active{ transform:scale(.98); }
.sv-btn.ghost{ background:#fbfcfd; color:var(--ink-2); margin-right:6px; } .sv-btn.ghost:hover:not(:disabled){ background:#eef1f4; color:var(--ink); border-color:#c2c9d1; } .sv-btn.ghost:disabled{ opacity:.4; cursor:not-allowed; }
.sv-btn.primary{ background:var(--gold); color:#2a1206; border-color:var(--gold); font-weight:600; box-shadow:0 2px 8px rgba(232,106,42,.32); } .sv-btn.primary:hover:not(:disabled){ filter:brightness(1.05); box-shadow:0 4px 14px rgba(232,106,42,.42); } .sv-btn.primary:disabled{ opacity:.4; cursor:not-allowed; box-shadow:none; }
.sv-note{ background:#e3f3ec; border:1px solid #bfe3d1; color:#0f5b3f; border-radius:9px; padding:10px 13px; font-size:12px; margin-bottom:11px; line-height:1.5; }
.sv-empty{ text-align:center; color:var(--ink-2); font-size:12.5px; padding:34px 16px; line-height:1.6; }
.sv-tablewrap{ overflow-x:auto; border:1px solid var(--line); border-radius:11px; }
.sv-table{ width:100%; border-collapse:collapse; font-size:12px; }
.sv-table th{ text-align:right; font-size:10px; letter-spacing:.05em; text-transform:uppercase; color:var(--ink-2); font-weight:600; padding:9px 12px; border-bottom:1px solid var(--line); white-space:nowrap; position:sticky; top:0; background:#f7f9fb; z-index:1; }
.sv-table th.l{ text-align:left; } .sv-table th.hook{ color:var(--gold); }
.sv-table td{ text-align:right; padding:10px 12px; border-bottom:1px solid #eef1f4; font-family:'IBM Plex Mono',monospace; white-space:nowrap; }
.sv-table td.l{ text-align:left; font-family:'Space Grotesk',sans-serif; }
.sv-table tbody tr{ transition:background .1s; }
.sv-table tbody tr:hover{ background:#f5f8fb; }
.sv-table tr.on{ background:#eaf1f7 !important; box-shadow:inset 3px 0 0 var(--steel); } .sv-table tr.dim{ opacity:.5; }
.sv-addr{ font-weight:600; font-size:12.5px; display:flex; align-items:center; gap:7px; } .sv-city{ color:var(--ink-2); font-weight:400; font-size:11px; }
.sv-dup{ font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:600; background:#e8eef4; color:var(--steel); padding:1px 7px; border-radius:9px; }
.sv-dnc{ font-size:9px; font-weight:700; background:#fbe6e3; color:var(--loss); padding:1px 7px; border-radius:9px; letter-spacing:.04em; }
.sv-contact{ font-size:11px; color:var(--ink-2); margin-top:2px; }
.sv-table td.hook{ font-weight:600; color:var(--gold); background:rgba(232,106,42,.06); }
.sv-offers{ display:flex; gap:4px; justify-content:flex-end; }
.ob{ font-family:'Space Grotesk',sans-serif; font-size:9.5px; font-weight:600; padding:2px 7px; border-radius:9px; background:#eef1f4; color:#aab6c1; letter-spacing:.04em; } .ob.on{ background:var(--ink); color:#fff; }
.chip{ display:inline-block; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; letter-spacing:.03em; font-family:'Space Grotesk',sans-serif; } .chip.ok{ background:#e3f3ec; color:var(--gain); } .chip.no{ background:#eef1f4; color:var(--ink-2); }
.sv-pitch{ margin-top:13px; background:var(--gold-soft); border-left:3px solid var(--gold); border-radius:0 10px 10px 0; padding:11px 14px; font-size:12.5px; color:#7a3d12; line-height:1.5; }
.sv-pitch-lbl{ display:block; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:#b3560f; margin-bottom:3px; font-weight:600; }
.sv-payload{ margin-top:13px; } .sv-payload-cap{ font-size:11px; color:var(--ink-2); margin-bottom:6px; }
.sv-payload pre{ background:var(--ink); color:#c8d6e2; padding:13px; border-radius:10px; font-family:'IBM Plex Mono',monospace; font-size:11px; line-height:1.5; overflow-x:auto; margin:0; max-height:320px; }
@media(max-width:860px){ .sv-stats{ grid-template-columns:1fr 1fr; } .sv-body{ grid-template-columns:1fr; } .sv-settings{ position:static; } }
`;
