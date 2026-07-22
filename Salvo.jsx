import React, { useState, useMemo, useRef } from "react";
import Papa from "papaparse";

/* =========================================================================
   SALVO — fire the whole list.
   Universal import (any CSV → required fields, flags what's missing) ·
   skip-trace enrichment · contactability + DNC · duplicate-contact flags ·
   Target × Offer modes · GHL-mapped CSV export.
   ========================================================================= */

const SEED = [
  {"Address":"11250 E Prairie Ave","City":"Mesa","State":"AZ","Zip":85212,"Owner 1 First Name":"Laurie","Owner 1 Last Name":"Bitz","Est. Remaining balance of Open Loans":91214,"Est. Value":562000,"Est. Equity":470786,"Monthly Rent":2090,"Est. Total Monthly Payments":554.35,"MLS Amount":554500,"MLS Agent Name":"Zack Bennett","MLS Agent Phone":"4803437653","MLS Agent E-Mail":"zacksbennett@gmail.com"},
  {"Address":"21561 W Kimberly Dr","City":"Buckeye","State":"AZ","Zip":85326,"Owner 1 First Name":"Mackenzie","Owner 1 Last Name":"Schexnyder","Est. Remaining balance of Open Loans":236837,"Est. Value":328000,"Est. Equity":91163,"Monthly Rent":1540,"Est. Total Monthly Payments":1572.63,"MLS Amount":320000,"MLS Agent Name":"Adrian Mojica","MLS Agent Phone":null,"MLS Agent E-Mail":"adrian@themojicateam.com"},
  {"Address":"1184 N 163rd Dr","City":"Goodyear","State":"AZ","Zip":85338,"Owner 1 First Name":"Lisa","Owner 1 Last Name":"Fritsch","Est. Remaining balance of Open Loans":276944,"Est. Value":353000,"Est. Equity":76056,"Monthly Rent":1615,"Est. Total Monthly Payments":1590.34,"MLS Amount":365000,"MLS Agent Name":"Michelle Minik","MLS Agent Phone":"6238104514","MLS Agent E-Mail":"Michelle@TeamMinik.com"},
  {"Address":"17866 W Villa Chula Ln","City":"Surprise","State":"AZ","Zip":85387,"Owner 1 First Name":"Kevin","Owner 1 Last Name":"Lee","Est. Remaining balance of Open Loans":361700,"Est. Value":450000,"Est. Equity":88300,"Monthly Rent":1985.58,"Est. Total Monthly Payments":1694.46,"MLS Amount":485000,"MLS Agent Name":"Christa Miranda","MLS Agent Phone":"8884610101","MLS Agent E-Mail":"christa@mirandagroupaz.com"},
  {"Address":"1229 E Gary Cir","City":"Mesa","State":"AZ","Zip":85203,"Owner 1 First Name":"George","Owner 1 Last Name":"Chac","Est. Remaining balance of Open Loans":316481,"Est. Value":569000,"Est. Equity":252519,"Monthly Rent":2228,"Est. Total Monthly Payments":1489.32,"MLS Amount":2900,"MLS Agent Name":"Michelle Minik","MLS Agent Phone":"6238104514","MLS Agent E-Mail":"Michelle@TeamMinik.com"},
  {"Address":"4953 Crusoe Creek Ct","City":"Las Vegas","State":"NV","Zip":89141,"Owner 1 First Name":"Maria","Owner 1 Last Name":"Rodriguez","Est. Remaining balance of Open Loans":121715,"Est. Value":411000,"Est. Equity":289285,"Monthly Rent":2313,"Est. Total Monthly Payments":1170.03,"MLS Amount":1965,"MLS Agent Name":"Alvin B. Tamura","MLS Agent Phone":"702-870-3226","MLS Agent E-Mail":"resys91@yahoo.com"},
  {"Address":"9025 Crystal Glass Dr","City":"Las Vegas","State":"NV","Zip":89117,"Owner 1 First Name":null,"Owner 1 Last Name":"Finnigan/Li Living Trust","Est. Remaining balance of Open Loans":153143,"Est. Value":516000,"Est. Equity":362857,"Monthly Rent":2314,"Est. Total Monthly Payments":1754.58,"MLS Amount":6200,"MLS Agent Name":"Mathew Berg","MLS Agent Phone":"866-807-9087","MLS Agent E-Mail":"info@usrealty.com"},
  {"Address":"10825 E Tripoli Ave","City":"Mesa","State":"AZ","Zip":85212,"Owner 1 First Name":"Garet","Owner 1 Last Name":"Klingensmith","Est. Remaining balance of Open Loans":384613,"Est. Value":532000,"Est. Equity":147387,"Monthly Rent":2032,"Est. Total Monthly Payments":2466.49,"MLS Amount":525000,"MLS Agent Name":"Jason L Penrose","MLS Agent Phone":null,"MLS Agent E-Mail":"offers@thepenroseteam.com"},
  {"Address":"8148 W Hammond Ln","City":"Phoenix","State":"AZ","Zip":85043,"Owner 1 First Name":"Juan","Owner 1 Last Name":"Raygoza","Est. Remaining balance of Open Loans":355638,"Est. Value":370000,"Est. Equity":14362,"Monthly Rent":1461,"Est. Total Monthly Payments":4477.58,"MLS Amount":369000,"MLS Agent Name":"Michael F. Olberding","MLS Agent Phone":"480-459-1911","MLS Agent E-Mail":"mike.olberding@BHHSAZ.com"},
  {"Address":"12568 W Chucks Ave","City":"Peoria","State":"AZ","Zip":85383,"Owner 1 First Name":"Michael","Owner 1 Last Name":"Milliken","Est. Remaining balance of Open Loans":536700,"Est. Value":499000,"Est. Equity":-37700,"Monthly Rent":1948,"Est. Total Monthly Payments":3835.25,"MLS Amount":535000,"MLS Agent Name":"Joshua Zuniga","MLS Agent Phone":"6232218668","MLS Agent E-Mail":"JOSH@JOSHZUNIGA.COM"},
];

/* ============================ smart mapper ============================== */
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? NaN : n; };
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const SPEC = {
  address:      { label: "Property address", req: true,  syn: ["propertyaddress","siteaddress","situsaddress","inputpropertyaddress","sitemail","streetaddress","address","street"] },
  city:         { label: "City",             req: false, syn: ["sitecity","inputpropertycity","city"] },
  state:        { label: "State",            req: false, syn: ["sitestate","inputpropertystate","state"] },
  zip:          { label: "Zip",              req: false, syn: ["sitezip","inputpropertyzip","zipcode","zip","postal"] },
  owner_full:   { label: "Owner full name",  req: false, syn: ["ownerfullname","ownersfullname","ownername"] },
  owner_first:  { label: "Owner first name", req: false, syn: ["owner1firstname","ownerfirstname","ownerfirst","firstname"] },
  owner_last:   { label: "Owner last name",  req: false, syn: ["owner1lastname","ownerlastname","ownerlast","lastname"] },
  home_value:   { label: "Home value",       req: true,  syn: ["estimatedmarketvalue","estmarketvalue","estimatedvalue","estvalue","marketvalue","homevalue","emv","avm","arv"] },
  loan_balance: { label: "Loan balance",     req: false, syn: ["remainingbalanceofopenloans","estimatedloanbalance","estloanbalance","loanbalance","mortgagebalance","openloans","elv"] },
  equity:       { label: "Equity",           req: false, syn: ["estimatedequity","estequity","equity","eev"] },
  monthly_rent: { label: "Monthly rent",     req: false, syn: ["monthlyrent","marketrent","rentestimate","estrent"] },
  loan_payment: { label: "Existing payment", req: false, syn: ["esttotalmonthlypayments","totalmonthlypayments","loanpayment","monthlypayment","piti"] },
  asking:       { label: "Asking / list price", req: false, syn: ["mlsamount","askingprice","listprice","listingprice","mlsprice"] },
  agent_name:   { label: "Agent name",       req: false, syn: ["mlsagentname","listingagentname","agentname"] },
  agent_email:  { label: "Agent email",      req: false, syn: ["mlsagentemail","listingagentemail","agentemail"] },
  agent_phone:  { label: "Agent phone",      req: false, syn: ["mlsagentphone","listingagentphone","agentphone"] },
  owner_cell:   { label: "Owner phone",      req: false, syn: ["phone1number","phone1","cellphone","ownerphone","phonenumber","mobile","phone","cell"] },
  owner_email:  { label: "Owner email",      req: false, syn: ["email1","owneremail","emailaddress","email"] },
};
const FIELD_ORDER = Object.keys(SPEC);

function autoMap(headers) {
  const H = headers.map((h) => [h, norm(h)]);
  const used = new Set(); const m = {};
  for (const stage of ["exact", "fuzzy"]) {
    for (const field of FIELD_ORDER) {
      if (m[field]) continue;
      for (const [h, nh] of H) {
        if (used.has(h)) continue;
        const hit = stage === "exact" ? SPEC[field].syn.includes(nh) : SPEC[field].syn.some((s) => nh.includes(s));
        if (hit) { m[field] = { header: h, how: stage }; used.add(h); break; }
      }
    }
  }
  return m;
}
function fileReport(map) {
  const missing = FIELD_ORDER.filter((f) => SPEC[f].req && !map[f]);
  const contact = ["agent_email", "agent_phone", "owner_cell", "owner_email"].some((k) => map[k]);
  let kind = "incomplete";
  if (!missing.length) kind = "base";
  else if (missing.includes("home_value") && map.address && contact) kind = "enrichment";
  return { missing, contact, kind };
}
function pickPhone(r) {
  let best = null;
  for (let i = 1; i <= 5; i++) {
    const nu = r[`Phone ${i}`];
    if (nu == null || nu === "") continue;
    const t = String(r[`Phone ${i} Type`] || "").toLowerCase();
    const dnc = ["true", "yes", "1", "y"].includes(String(r[`Phone ${i} DNC`] || "").trim().toLowerCase());
    if ((t.includes("mobile") || t.includes("wireless") || t.includes("cell")) && !dnc) return { cell: nu, dnc: false };
    if (best == null && !dnc) best = nu;
  }
  if (best != null) return { cell: best, dnc: false };
  return { cell: r["Phone 1"] ?? null, dnc: !!r["Phone 1"] };
}
function normalizeWithMap(rows, map) {
  if (!rows || !rows.length) return [];
  const g = (r, f) => (map[f] ? r[map[f].header] : undefined);
  const gn = (r, f) => num(g(r, f));
  const phoneBlock = rows[0] && "Phone 1" in rows[0] && "Phone 1 DNC" in rows[0];
  return rows.map((r) => {
    const o = {};
    o.address = g(r, "address"); o.city = g(r, "city"); o.state = g(r, "state"); o.zip = g(r, "zip");
    o.owner_first = g(r, "owner_first"); o.owner_last = g(r, "owner_last");
    o.home_value = gn(r, "home_value"); o.loan_balance = gn(r, "loan_balance"); o.equity = gn(r, "equity");
    o.monthly_rent = gn(r, "monthly_rent"); o.loan_payment = gn(r, "loan_payment"); o.asking = gn(r, "asking");
    o.agent_name = g(r, "agent_name"); o.agent_email = g(r, "agent_email"); o.agent_phone = g(r, "agent_phone");
    o.owner_email = g(r, "owner_email");
    if (phoneBlock) { const p = pickPhone(r); o.owner_cell = p.cell; o.owner_dnc = p.dnc; }
    else { o.owner_cell = g(r, "owner_cell"); o.owner_dnc = false; }
    const fn = (o.owner_first || "").trim(), ln = (o.owner_last || "").trim();
    o.owner_full = g(r, "owner_full") || `${fn} ${ln}`.trim() || null;
    return o;
  }).filter((o) => o.address);
}
const keyOf = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
function enrich(base, add) {
  if (!add || !add.length) return base;
  const lut = new Map();
  add.forEach((a) => { const k = keyOf(a.address); if (k && !lut.has(k)) lut.set(k, a); });
  return base.map((b) => {
    const hit = lut.get(keyOf(b.address));
    if (!hit) return b;
    return { ...b, owner_cell: b.owner_cell || hit.owner_cell, owner_email: b.owner_email || hit.owner_email,
      owner_dnc: b.owner_cell ? b.owner_dnc : hit.owner_dnc };
  });
}

/* ------------------------------ underwrite ----------------------------- */
function underwrite(r, s) {
  const value = r.home_value, loan = r.loan_balance, loanpmt = isNaN(r.loan_payment) ? 0 : r.loan_payment;
  const rent = r.monthly_rent;
  let eq = r.equity;
  if (isNaN(value) || value === 0) return { creative_ok: false, cash_ok: false };
  if (isNaN(eq) && !isNaN(loan)) eq = value - loan;
  const price = r.asking > 20000 ? r.asking : value;
  const down = isNaN(eq) || eq < 0 ? NaN : Math.min(eq * s.downPct / 100, s.downCap);
  const financed = price - (loan || 0) - (isNaN(down) ? 0 : down);
  const m2s = financed > 0 ? financed / s.amortMonths : 0;
  const total = m2s + loanpmt;
  const passesPmt = !isNaN(rent) && total <= rent + s.tolerance;
  const creative_ok = !isNaN(down) && passesPmt && (s.requirePositiveFinanced ? financed > 0 : true);
  const isc = value * s.sellingPct / 100;
  const cash = value * s.cashPct / 100;
  const net_cash = cash - (loan || 0);
  const cash_ok = (s.requireKnownLoan ? !isNaN(loan) : true) && (s.requireCashClears ? net_cash > 0 : true);
  return { creative_ok, cash_ok, price, down, financed: Math.max(0, financed), m2s, total,
    sub_payment: loanpmt, industry_costs: isc, home_value: value, loan_balance: loan || 0,
    net_trad: value - isc - (loan || 0), net_crea: price - (loan || 0), diff: (price - (loan || 0)) - (value - isc - (loan || 0)),
    cash, net_cash };
}
function contactFor(r, who) {
  if (who === "agent") return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true };
  if (r.owner_email || r.owner_cell) return { name: r.owner_full, email: r.owner_email, phone: r.owner_cell, viaAgent: false };
  return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true };
}

/* ------------------------------ formatting ----------------------------- */
const usd = (n) => (isFinite(n) && !isNaN(n) ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—");
const usdk = (n) => (isFinite(n) ? (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n / 1000)) + "k" : "—");
const fcT = (v) => (v == null || isNaN(v) || v <= 0 ? "TBD" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fcS = (v) => (v == null || isNaN(v) ? "TBD" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const fmtDate = (d = new Date()) => d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
const fmtPhone = (v) => { if (v == null || v === "") return ""; const d = String(v).replace(/\D/g, ""); const t = d.length === 11 && d[0] === "1" ? d.slice(1) : d; return t.length === 10 ? `${t.slice(0,3)}-${t.slice(3,6)}-${t.slice(6)}` : String(v); };

const TARGETS = { agent: "Agent", seller: "Seller" };
const OFFERS = { creative: "Creative", cash: "Cash", both: "Cash + Creative" };
const TARGET_LABEL = { agent: "Direct-to-Agent", seller: "Direct-to-Seller" };
const MODES = { creative: "creative", cash: "cash", both: "both" };
const DEFAULTS = { downPct: 50, downCap: 30000, amortMonths: 360, tolerance: 200, sellingPct: 12, cashPct: 80, requirePositiveFinanced: true, requireCashClears: true, requireKnownLoan: false };

/* ------------------------------ CSV export ----------------------------- */
function buildExportRow(x, target, offer, dupCount) {
  const { r, u, creativeOK, cashOK, contact } = x;
  const meta = {
    "Contact Name": contact.name || "", "Contact Email": contact.email || "", "Contact Phone": fmtPhone(contact.phone),
    "Contact Type": contact.viaAgent ? "Listing Agent" : "Owner", "Contact DNC": (!contact.viaAgent && r.owner_dnc && !contact.email) ? "true" : "false",
    "Listings For Contact": dupCount, "City": r.city || "", "State": r.state || "",
    "Offer Type": OFFERS[offer], "Tags": `Salvo, ${TARGET_LABEL[target]}, ${OFFERS[offer]}`, "Pipeline Stage": "Offer Ready",
    "Owner Full Name": r.owner_full || "", "Address": r.address || "", "Date": fmtDate(),
  };
  const crea = { "Has Creative": creativeOK ? "true" : "false", "Price": fcT(u.price), "Loan Balance": fcT(u.loan_balance),
    "Down": fcT(u.down), "Financed": fcT(u.financed), "Payment": fcT(u.m2s), "Sub Payment": fcT(u.sub_payment),
    "Seller Profit Creative": fcT(u.net_crea), "Seller Profit Traditional": fcS(u.net_trad), "Seller Profit Difference": fcT(u.diff) };
  const cash = { "Has Cash": cashOK ? "true" : "false", "Cash Scenario": fcT(u.cash), "Net Cash": fcT(u.net_cash) };
  const shared = { "Industry Costs": fcT(u.industry_costs), "Home Value": fcT(u.home_value) };
  if (offer === "cash") return { ...meta, ...cash, ...shared };
  return { ...meta, ...crea, ...cash, ...shared };
}
function toCSV(rows) {
  const keys = []; rows.forEach((o) => Object.keys(o).forEach((k) => { if (!keys.includes(k)) keys.push(k); }));
  const esc = (v) => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return [keys.join(","), ...rows.map((o) => keys.map((k) => esc(o[k])).join(","))].join("\n");
}
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
              {FIELD_ORDER.map((f) => (
                <label key={f} className={`sv-mf ${SPEC[f].req && !mapping[f] ? "req-miss" : ""}`}>
                  <span className="sv-mf-l">{SPEC[f].label}{SPEC[f].req && <b className="req">*</b>}</span>
                  <select value={mapping[f]?.header || ""} onChange={(e) => setMap(f, e.target.value)}>
                    <option value="">— none —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {mapping[f] && <span className={`sv-how ${mapping[f].how}`}>{mapping[f].how === "manual" ? "set" : mapping[f].how === "exact" ? "auto" : "guess"}</span>}
                </label>
              ))}
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
.sv-how.exact{ background:#e3f3ec; color:var(--gain); } .sv-how.fuzzy{ background:var(--gold-soft); color:#b3560f; } .sv-how.manual{ background:#e8eef4; color:var(--steel); }
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
