/* =========================================================================
   Salvo engine — pure, framework-free.
   Mapper · normalize · enrich · underwrite · contact resolution · formatting
   · GHL-mapped export. Shared by the front-end (Salvo.jsx) and the batch
   PDF/CSV render pipeline (scripts/render_lois.jsx) so the math lives in one
   place. This mirrors SALVO_BUILD.md §3 ("keep the engine pure") and §4–§8.
   ========================================================================= */

export const SEED = [
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
export const num = (v) => { const n = parseFloat(v); return isNaN(n) ? NaN : n; };
export const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const SPEC = {
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
export const FIELD_ORDER = Object.keys(SPEC);

export function autoMap(headers) {
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
export function fileReport(map) {
  const missing = FIELD_ORDER.filter((f) => SPEC[f].req && !map[f]);
  const contact = ["agent_email", "agent_phone", "owner_cell", "owner_email"].some((k) => map[k]);
  let kind = "incomplete";
  if (!missing.length) kind = "base";
  else if (missing.includes("home_value") && map.address && contact) kind = "enrichment";
  return { missing, contact, kind };
}
export function pickPhone(r) {
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
export function normalizeWithMap(rows, map) {
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
export const keyOf = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function enrich(base, add) {
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
export function underwrite(r, s) {
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
export function contactFor(r, who) {
  if (who === "agent") return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true };
  if (r.owner_email || r.owner_cell) return { name: r.owner_full, email: r.owner_email, phone: r.owner_cell, viaAgent: false };
  return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true };
}

/* ------------------------------ formatting ----------------------------- */
export const usd = (n) => (isFinite(n) && !isNaN(n) ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—");
export const usdk = (n) => (isFinite(n) ? (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n / 1000)) + "k" : "—");
export const fcT = (v) => (v == null || isNaN(v) || v <= 0 ? "TBD" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const fcS = (v) => (v == null || isNaN(v) ? "TBD" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export const fmtDate = (d = new Date()) => d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
export const fmtPhone = (v) => { if (v == null || v === "") return ""; const d = String(v).replace(/\D/g, ""); const t = d.length === 11 && d[0] === "1" ? d.slice(1) : d; return t.length === 10 ? `${t.slice(0,3)}-${t.slice(3,6)}-${t.slice(6)}` : String(v); };

export const TARGETS = { agent: "Agent", seller: "Seller" };
export const OFFERS = { creative: "Creative", cash: "Cash", both: "Cash + Creative" };
export const TARGET_LABEL = { agent: "Direct-to-Agent", seller: "Direct-to-Seller" };
export const MODES = { creative: "creative", cash: "cash", both: "both" };
export const DEFAULTS = { downPct: 50, downCap: 30000, amortMonths: 360, tolerance: 200, sellingPct: 12, cashPct: 80, requirePositiveFinanced: true, requireCashClears: true, requireKnownLoan: false };

/* ------------------------------ CSV export ----------------------------- */
export function buildExportRow(x, target, offer, dupCount) {
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
export function toCSV(rows) {
  const keys = []; rows.forEach((o) => Object.keys(o).forEach((k) => { if (!keys.includes(k)) keys.push(k); }));
  const esc = (v) => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return [keys.join(","), ...rows.map((o) => keys.map((k) => esc(o[k])).join(","))].join("\n");
}
