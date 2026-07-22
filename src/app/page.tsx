"use client";

import Papa from "papaparse";
import { ChangeEvent, useMemo, useState } from "react";
import { classify, FIELDS, FieldMap, normalizeWithMap, smartMap } from "@/lib/engine/mapper";
import { exportRows, toCsv } from "@/lib/engine/export";
import { fcT } from "@/lib/engine/format";
import { contactFor, qualifies, underwrite } from "@/lib/engine/underwrite";
import { DEFAULT_SETTINGS, OfferMode, Property, Settings, Target } from "@/lib/engine/types";

const demo: Property[] = [
  { address:"1527 Oakwood Drive", city:"Phoenix", state:"AZ", home_value:325000, loan_balance:178000, monthly_rent:2600, loan_payment:1240, asking:315000, owner_full:"Jordan Hayes", agent_name:"Maya Flores", agent_email:"maya@brokerage.com", agent_phone:"602-555-0142" },
  { address:"800 W Juniper Avenue", city:"Phoenix", state:"AZ", home_value:285000, loan_balance:236000, monthly_rent:2250, loan_payment:1680, owner_full:"Casey Morgan", agent_name:"Maya Flores", agent_email:"maya@brokerage.com", agent_phone:"602-555-0142" },
  { address:"4112 East Roma Avenue", city:"Phoenix", state:"AZ", home_value:410000, loan_balance:125000, monthly_rent:3100, loan_payment:1075, owner_full:"Riley Stone", owner_email:"riley@example.com", owner_cell:"480-555-0199" },
];

export default function Home() {
  const [rows, setRows] = useState<Property[]>(demo), [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<FieldMap>({}), [target, setTarget] = useState<Target>("agent");
  const [mode, setMode] = useState<OfferMode>("both"), [reachableOnly, setReachableOnly] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const kind = classify(map);
  const calculated = useMemo(() => rows.map(property => ({ property, offer:underwrite(property, settings), contact:contactFor(property, target) })), [rows, settings, target]);
  const emailCount = useMemo(() => calculated.reduce<Record<string,number>>((a, r) => { if (r.contact.email) a[r.contact.email]=(a[r.contact.email]??0)+1; return a; }, {}), [calculated]);
  const ready = calculated.filter(r => qualifies(r.offer, mode)).filter(r => !reachableOnly || Boolean(r.contact.email || (r.contact.phone && !(r.contact.dnc && !r.contact.viaAgent))));
  const sorted = [...ready].sort((a,b) => (mode==="cash" ? (b.offer.net_cash??0)-(a.offer.net_cash??0) : mode==="creative" ? (b.offer.diff??0)-(a.offer.diff??0) : Math.max(b.offer.creative_ok ? b.offer.diff??0 : 0,b.offer.cash_ok ? b.offer.net_cash??0:0)-Math.max(a.offer.creative_ok ? a.offer.diff??0:0,a.offer.cash_ok?a.offer.net_cash??0:0)));

  function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    Papa.parse<Record<string,string>>(file, { header:true, skipEmptyLines:true, complete:({ data, meta }) => {
      const next = smartMap(meta.fields ?? []); setHeaders(meta.fields ?? []); setMap(next); setRows(normalizeWithMap(data, next));
    }});
  }
  function updateNumber(key: keyof Settings, value: string) { setSettings(s => ({...s, [key]: Number(value)})); }
  function download() {
    const output = toCsv(exportRows(sorted.map(x => x.property), settings, target, mode));
    const url = URL.createObjectURL(new Blob([output], {type:"text/csv"})), a=document.createElement("a"); a.href=url; a.download="salvo-ghl-offers.csv"; a.click(); URL.revokeObjectURL(url);
  }
  return <div className="shell">
    <header className="header"><div><div className="logo">SALVO</div><div className="tagline">Offer intelligence · fire the whole list.</div></div><div className="tagline">BrightPath Real Estate Solutions, LLC</div></header>
    <main className="main">
      <section className="card"><div className="grid">
        <div className="upload"><strong>Import your list</strong><p className="muted">PropStream, PropWire, BatchLeads, or any CSV.</p><input type="file" accept=".csv,text/csv" onChange={importCsv}/>{headers.length>0 && <p><span className="badge good">{kind.kind}</span> {rows.length} valid addresses · {kind.missing.length ? `Missing: ${kind.missing.join(", ")}` : "Ready to underwrite"}</p>}</div>
        <div><label className="field">TARGET</label><div className="segments target">{(["agent","seller"] as Target[]).map(x=><button key={x} className={target===x?"active":""} onClick={()=>setTarget(x)}>● Direct-to-{x[0].toUpperCase()+x.slice(1)}</button>)}</div>
          <label className="field" style={{marginTop:16}}>OFFER</label><div className="segments offer">{(["creative","cash","both"] as OfferMode[]).map(x=><button key={x} className={mode===x?"active":""} onClick={()=>setMode(x)}>● {x==="both"?"Cash + Creative":x}</button>)}</div></div>
        <div><label><input type="checkbox" checked={reachableOnly} onChange={e=>setReachableOnly(e.target.checked)} style={{width:"auto",marginRight:8}}/>Reachable only</label><p className="muted">Contacts without an email, or an eligible phone, are excluded when enabled.</p><button className="action" disabled={!ready.length} onClick={download}>Export GHL CSV ({ready.length})</button></div>
      </div></section>
      {headers.length>0 && <section className="card"><h3>Review mapping <span className="badge good">{kind.kind}</span></h3><div className="mapping">{FIELDS.map(([field, required])=><div className="map-row" key={field}><small>{required?"REQUIRED ":""}{field}</small><select value={map[field]?.header??""} onChange={e=>setMap(m=>({...m,[field]:e.target.value?{header:e.target.value,status:"set"}:undefined}))}><option value="">— none —</option>{headers.map(h=><option key={h}>{h}</option>)}</select><small>{map[field]?.status??"unmapped"}</small></div>)}</div></section>}
      <section className="card"><h3>Underwriting settings</h3><div className="grid">{([["downPct","Down %"],["downCap","Down cap"],["amortMonths","Amortization (months)"],["tolerance","Rent tolerance"],["sellingPct","Selling costs %"],["cashPct","Cash offer %"]] as const).map(([key,label])=><div className="field" key={key}><label>{label}</label><input type="number" value={settings[key]} onChange={e=>updateNumber(key,e.target.value)}/></div>)}</div></section>
      <section className="card"><div className="grid"><div className="stat"><strong>{rows.length}</strong><span>IMPORTED</span></div><div className="stat"><strong>{calculated.filter(x=>x.offer.creative_ok).length}</strong><span>CREATIVE READY</span></div><div className="stat"><strong>{calculated.filter(x=>x.offer.cash_ok).length}</strong><span>CASH READY</span></div><div className="stat"><strong>{ready.length}</strong><span>IN CAMPAIGN</span></div></div></section>
      <section className="card"><h2>Offer console</h2><div className="scroll"><table><thead><tr><th>Property / Contact</th>{mode!=="cash"&&<><th>Rent vs Pmt</th><th>Down</th><th>SF Difference</th></>}{mode!=="creative"&&<><th>Cash Offer</th><th>Net Cash</th></>}<th>Status</th></tr></thead><tbody>{sorted.map(({property,offer,contact})=><tr key={property.address}><td><strong>{property.address}</strong><br/><span className="muted">{contact.name??"No contact"} {contact.email && emailCount[contact.email]>1 && <span className="badge warn">×{emailCount[contact.email]}</span>} {contact.dnc&&!contact.email&&<span className="badge bad">DNC</span>}</span></td>{mode!=="cash"&&<><td>{fcT(property.monthly_rent)} / {fcT(offer.total)}</td><td>{fcT(offer.down)}</td><td style={{color:"var(--gain)",fontWeight:"bold"}}>{fcT(offer.diff)}</td></>}{mode!=="creative"&&<><td>{fcT(offer.cash)}</td><td style={{fontWeight:"bold"}}>{fcT(offer.net_cash)}</td></>}<td><span className="badge good">{offer.creative_ok&&offer.cash_ok?"CR + CA":offer.creative_ok?"CR":offer.cash_ok?"CA":"No offer"}</span></td></tr>)}</tbody></table>{!sorted.length&&<p className="muted">No qualifying properties for this selection.</p>}</div></section>
    </main>
  </div>;
}
