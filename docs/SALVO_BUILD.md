# Salvo — Production Build Spec

> Hand this file to Cursor. It contains the full product, the exact underwriting math, the smart-import mapper, the GHL export contract, the LOI PDF spec, the database schema, the design system, and a phased task list. Two working prototypes exist and should be treated as reference implementations to port: `Salvo.jsx` (the full front-end + engine, in JS) and `blaster_engine.py` (the batch engine). The math in this doc is the source of truth; where prototype and doc disagree, follow the doc.

---

## 1. What Salvo is

Salvo is a real-estate **offer-intelligence engine**. It ingests a property list (PropStream / PropWire / BatchLeads / any CSV), underwrites a **creative-finance** and a **cash** offer for every property, and fires personalized Letters of Intent (LOIs) at volume — either to the **listing agent** (Direct-to-Agent) or the **owner** (Direct-to-Seller, via skip-trace).

Salvo is **not a CRM**. GoHighLevel (GHL) remains the CRM, pipeline, email/SMS, tasks, and automation layer. Salvo's job is: **analyze → calculate → generate → hand off.** It outputs either (a) a GHL-mapped CSV or (b) a rendered LOI PDF.

The persuasion hook is the **Seller Finance Difference**: the seller nets more selling creatively than via a traditional MLS sale after ~12% selling costs. That number is the sort key and the headline of every creative LOI.

**Buyer entity on all offers:** `BrightPath Real Estate Solutions, LLC (and/or assigns)`.

**Success targets:** import a list in < 30s · generate an LOI in < 60s · fire 100+ personalized LOIs in < 10 min.

---

## 2. Tech stack

- **Frontend:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui
- **Charts:** Recharts · **PDF:** `@react-pdf/renderer`
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Email:** Resend · **Hosting:** Vercel
- **Integrations:** GoHighLevel API v2 (LeadConnector), PropStream (CSV now, API later)
- **CSV parse:** `papaparse` (client-side for preview, server-side for large imports)

---

## 3. Architecture / data flow

```
Upload CSV ──▶ Smart Map ──▶ Normalize ──▶ [optional] Enrich (skip-trace join)
                                                │
                                                ▼
                                          Underwrite  (creative + cash per row)
                                                │
                              ┌─────────────────┼─────────────────┐
                              ▼                 ▼                 ▼
                       Contactability     Dedupe / dup-flag   Qualify (mode)
                              └─────────────────┼─────────────────┘
                                                ▼
                                       Select properties
                                                │
                              ┌─────────────────┴─────────────────┐
                              ▼                                   ▼
                    Export GHL-mapped CSV                Render LOI PDF (react-pdf)
                              │                                   │
                              ▼                                   ▼
                    GHL contact + custom fields          Store PDF (Supabase Storage)
                    + opportunity + tag + workflow        attach to GHL contact
```

Keep the **engine pure and framework-free** (`/lib/engine/*.ts`) so it runs identically in the browser (live preview) and in an Edge Function (batch import of large lists). This mirrors how `Salvo.jsx`'s engine equals `blaster_engine.py`.

---

## 4. The underwriting engine (`/lib/engine/underwrite.ts`)

### 4.1 Settings (all tunable; these are the reconciled defaults)

```ts
export interface Settings {
  downPct: number;              // 50   — down payment = this % of equity...
  downCap: number;              // 30000 — ...capped here
  amortMonths: number;          // 360  — straight (0% interest) seller-carry amortization
  tolerance: number;            // 200  — creative qualifies if total monthly <= rent + tolerance
  sellingPct: number;           // 12   — "industry" selling cost the seller avoids
  cashPct: number;              // 80   — cash offer as % of home value (v1 drifted 78/80; use 80)
  requirePositiveFinanced: boolean; // true — skip degenerate creatives (financed <= 0)
  requireCashClears: boolean;   // true — cash offer must clear the loan (net_cash > 0)
  requireKnownLoan: boolean;    // false — cash needs a known loan balance (skip blank-loan rows)
}
export const DEFAULT_SETTINGS: Settings = {
  downPct: 50, downCap: 30000, amortMonths: 360, tolerance: 200,
  sellingPct: 12, cashPct: 80,
  requirePositiveFinanced: true, requireCashClears: true, requireKnownLoan: false,
};
```

### 4.2 Normalized property (engine input)

```ts
export interface Property {
  address: string; city?: string; state?: string; zip?: string;
  home_value: number; loan_balance?: number; equity?: number;
  monthly_rent?: number; loan_payment?: number; asking?: number;
  owner_full?: string; owner_first?: string; owner_last?: string;
  agent_name?: string; agent_email?: string; agent_phone?: string;
  owner_cell?: string; owner_email?: string; owner_dnc?: boolean;
}
```

### 4.3 The math (transcribe EXACTLY)

```ts
export function underwrite(r: Property, s: Settings) {
  const value = r.home_value, loan = r.loan_balance, loanpmt = r.loan_payment ?? 0;
  const rent = r.monthly_rent;
  if (!value) return { creative_ok: false, cash_ok: false };

  let eq = r.equity;
  if (eq == null && loan != null) eq = value - loan;      // derive equity if absent

  // guard: an MLS/asking figure below 20,000 is almost always a mismapped rent value
  const price = (r.asking && r.asking > 20000) ? r.asking : value;

  // ---- creative (Subject-To + seller carry) ----
  const down = (eq == null || eq < 0) ? null : Math.min(eq * s.downPct/100, s.downCap);
  const financed = price - (loan ?? 0) - (down ?? 0);
  const m2s = financed > 0 ? financed / s.amortMonths : 0;   // monthly to seller
  const total = m2s + loanpmt;
  const passesPmt = rent != null && total <= rent + s.tolerance;
  const creative_ok = down != null && passesPmt &&
                      (s.requirePositiveFinanced ? financed > 0 : true);

  const industry_costs = value * s.sellingPct/100;
  const net_trad = value - industry_costs - (loan ?? 0);     // seller net, traditional MLS sale
  const net_crea = price - (loan ?? 0);                      // seller net, creative sale
  const diff = net_crea - net_trad;                          // ← the Seller Finance Difference

  // ---- cash ----
  const cash = value * s.cashPct/100;
  const net_cash = cash - (loan ?? 0);
  const cash_ok = (s.requireKnownLoan ? loan != null : true) &&
                  (s.requireCashClears ? net_cash > 0 : true);

  return { creative_ok, cash_ok, price, down, financed: Math.max(0, financed), m2s, total,
           sub_payment: loanpmt, industry_costs, home_value: value, loan_balance: loan ?? 0,
           net_trad, net_crea, diff, cash, net_cash };
}
```

### 4.4 Currency formatting (matches the LOI templates)

- `fcT(v)` → `"TBD"` if `v` is null/NaN/`<= 0`, else `"$#,##0.00"`. Use for all money that shouldn't show negatives (Price, Down, Financed, Payment, Sub Payment, Seller Profit Creative/Difference, Industry Costs, Home Value, Cash Scenario, Net Cash).
- `fcS(v)` → signed; `"TBD"` only if null/NaN; allows negatives. Use for **Seller Profit Traditional** only (can legitimately be negative).

### 4.5 Contact resolution

```ts
function contactFor(r, target: "agent" | "seller") {
  if (target === "agent") return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true };
  if (r.owner_email || r.owner_cell) return { name: r.owner_full, email: r.owner_email, phone: r.owner_cell, viaAgent: false };
  return { name: r.agent_name, email: r.agent_email, phone: r.agent_phone, viaAgent: true }; // fallback
}
```

---

## 5. Smart import & mapping (`/lib/engine/mapper.ts`)

Accept **any** CSV. Auto-map headers → canonical fields via exact-then-fuzzy substring matching over a synonym dictionary, then let the user override.

### 5.1 Field spec (`req` = required to run)

| Field | req | Synonyms (normalized: lowercase, strip non-alphanumeric) |
|---|---|---|
| `address` | ✅ | propertyaddress, siteaddress, situsaddress, inputpropertyaddress, sitemail, streetaddress, address, street |
| `city` |  | sitecity, inputpropertycity, city |
| `state` |  | sitestate, inputpropertystate, state |
| `zip` |  | sitezip, inputpropertyzip, zipcode, zip, postal |
| `owner_full` |  | ownerfullname, ownersfullname, ownername |
| `owner_first` |  | owner1firstname, ownerfirstname, ownerfirst, firstname |
| `owner_last` |  | owner1lastname, ownerlastname, ownerlast, lastname |
| `home_value` | ✅ | estimatedmarketvalue, estmarketvalue, estimatedvalue, estvalue, marketvalue, homevalue, emv, avm, arv |
| `loan_balance` |  | remainingbalanceofopenloans, estimatedloanbalance, estloanbalance, loanbalance, mortgagebalance, openloans, elv |
| `equity` |  | estimatedequity, estequity, equity, eev |
| `monthly_rent` |  | monthlyrent, marketrent, rentestimate, estrent |
| `loan_payment` |  | esttotalmonthlypayments, totalmonthlypayments, loanpayment, monthlypayment, piti |
| `asking` |  | mlsamount, askingprice, listprice, listingprice, mlsprice |
| `agent_name` |  | mlsagentname, listingagentname, agentname |
| `agent_email` |  | mlsagentemail, listingagentemail, agentemail |
| `agent_phone` |  | mlsagentphone, listingagentphone, agentphone |
| `owner_cell` |  | phone1number, phone1, cellphone, ownerphone, phonenumber, mobile, phone, cell |
| `owner_email` |  | email1, owneremail, emailaddress, email |

**Matching algorithm:** two passes over fields (in the order above). Pass 1 = exact normalized equality; pass 2 = fuzzy (`normalizedHeader.includes(synonym)`). **Only `synonym ⊂ header`, never the reverse** — reversing causes generic headers like `email` to hijack `agent_email`. Each header maps to at most one field (mark used).

### 5.2 File classification

```
missing   = required fields with no mapping
hasContact = any of agent_email | agent_phone | owner_cell | owner_email mapped
kind = missing.length === 0            → "base"        (ready to blast)
     : missing includes home_value
         && address mapped && hasContact → "enrichment" (skip-trace / phone list)
     : otherwise                        → "incomplete"
```

Show the kind as a badge, warn on missing required fields, and expose a **Review mapping** grid where every field is a dropdown (`— none —` + all headers) tagged `auto` (exact) / `guess` (fuzzy) / `set` (manual).

### 5.3 Normalize + enrich

- `normalizeWithMap(rows, map)` → `Property[]`. Numeric fields (`home_value, loan_balance, equity, monthly_rent, loan_payment, asking`) go through `parseFloat`. Build `owner_full` from `owner_full` map or `owner_first + owner_last`. Drop rows with no `address`.
- **DNC-aware phone:** if the file has a `Phone 1..5` + `Phone N Type` + `Phone N DNC` block (PropStream), pick the first **mobile, non-DNC** number; else first non-DNC; else `Phone 1` with `owner_dnc = true`. Otherwise use the single mapped `owner_cell` with `owner_dnc = false`.
- `enrich(base, addRows)` → join skip-trace `owner_cell`/`owner_email` onto base rows by a normalized address key (`lowercase`, strip non-alphanumeric). Only fill blanks; never overwrite existing contact.

---

## 6. Modes, qualification, contactability, dedupe

- **Target × Offer** are two independent axes. Target ∈ {`agent`, `seller`}; Offer ∈ {`creative`, `cash`, `both`}.
- **Ready** per row: creative → `creative_ok`; cash → `cash_ok`; both → `creative_ok || cash_ok`.
- **Sort key:** cash → `net_cash`; creative → `diff`; both → `max(diff if creative_ok, net_cash if cash_ok)`.
- **Contactability:** `reachable = !!email || (!!phone && !(owner_dnc && !viaAgent))`. Provide a "Reachable only" filter and a reachable-count metric.
- **DNC:** flag rows where the resolved contact is a DNC owner phone with no email fallback. Surface a `DNC` badge and a `Contact DNC` export column so GHL can hold those back from SMS.
- **Duplicate contact:** group ready rows by contact email; when count > 1, badge each row `×N` and expose `Listings For Contact` in the export so GHL consolidates them under one contact instead of blind-spamming one inbox. (This is desired — you *want* to offer on all of an agent's listings, just under one contact record.)

---

## 7. LOI templates & merge-field contract

Two templates exist as `.docx` today; rebuild them as **react-pdf** components. Field names below are the exact merge tags — the GHL custom-field keys must match.

### 7.1 Creative LOI (Subject-To + Seller Finance)

Merge fields: `{{Owner Full Name}}`, `{{Address}}`, `{{Date}}`, `{{Price}}`, `{{Loan Balance}}`, `{{Down}}`, `{{Financed}}`, `{{Payment}}` (monthly to seller), `{{Sub Payment}}` (existing loan pmt, paid via servicer), `{{Seller Profit Creative}}`, `{{Seller Profit Traditional}}`, `{{Seller Profit Difference}}`, `{{Industry Costs}}`, `{{Home Value}}`.
Hardcoded in-template: **Balloon** = "To be Determined (TBD)"; **Interest** = "Built-Into Purchase Price"; buyer = BrightPath; 14-day inspection, 30-day close, 1% EMD, up to 3% agent comp, standard as-is clauses.
> The current creative `.docx` has the **Cash LOI appended as a second page**, so a creative send also needs the cash fields. Keep this behavior configurable (single vs combined).

### 7.2 Cash LOI

Merge fields: `{{Owner Full Name}}`, `{{Address}}`, `{{Date}}`, `{{Cash Scenario}}` (purchase price), `{{Net Cash}}`, `{{Industry Costs}}`.

### 7.3 Field → source map (for GHL custom fields & PDF)

| Merge tag | Source (from `underwrite`) | Format |
|---|---|---|
| Price | `price` | fcT |
| Loan Balance | `loan_balance` | fcT |
| Down | `down` | fcT |
| Financed | `financed` | fcT |
| Payment | `m2s` | fcT |
| Sub Payment | `sub_payment` | fcT |
| Seller Profit Creative | `net_crea` | fcT |
| Seller Profit Traditional | `net_trad` | fcS (signed) |
| Seller Profit Difference | `diff` | fcT |
| Industry Costs | `industry_costs` | fcT |
| Home Value | `home_value` | fcT |
| Cash Scenario | `cash` | fcT |
| Net Cash | `net_cash` | fcT |
| Date | today `Month DD, YYYY` | — |
| Owner Full Name / Address | property | — |

---

## 8. Export contract

### 8.1 GHL-mapped CSV (`/lib/engine/export.ts`)

One row per selected property. **Cash** mode emits only cash fields; **creative/both** emit the full union (the cash page rides along with creative). Column order:

```
Contact Name, Contact Email, Contact Phone, Contact Type, Contact DNC,
Listings For Contact, City, State, Offer Type, Tags, Pipeline Stage,
Owner Full Name, Address, Date,
[Has Creative, Price, Loan Balance, Down, Financed, Payment, Sub Payment,
 Seller Profit Creative, Seller Profit Traditional, Seller Profit Difference,]  ← creative/both only
Has Cash, Cash Scenario, Net Cash, Industry Costs, Home Value
```

- Phones normalized to `XXX-XXX-XXXX` (prevents Excel scientific-notation corruption).
- `Tags` = `Salvo, {Direct-to-Agent|Direct-to-Seller}, {Creative|Cash|Cash + Creative}`.
- `Pipeline Stage` = `Offer Ready`. `Has Creative`/`Has Cash` are booleans that let a GHL workflow branch (send the LOI that applies).

### 8.2 GHL API push (preferred over CSV once auth is set)

GHL API v2 (LeadConnector), per selected property:
1. **Upsert contact** — `POST /contacts/` with name/email/phone + custom fields (each merge tag = a custom field; create them once in the GHL account and store their IDs).
2. **Tag** the contact (Salvo, mode tags).
3. **Create opportunity** — `POST /opportunities/` in the acquisitions pipeline at stage "Offer Ready".
4. **Trigger workflow** — add the contact to the "Offer Ready" workflow (or set a trigger tag). The GHL workflow generates/sends the LOI email + follow-ups.

Auth: GHL Private Integration token (or OAuth app) stored per organization. Rate-limit and batch (queue in an Edge Function). Handle 429s with backoff.

---

## 9. Database (Supabase / Postgres)

```
organizations   (id, name, created_at)
users           (id, org_id, email, role)
ghl_connections (id, org_id, access_token, location_id, custom_field_ids jsonb, pipeline_id, stage_id)

import_batches  (id, org_id, filename, source_kind, mapping jsonb, row_count, created_by, created_at)
properties      (id, org_id, batch_id, address, city, state, zip, home_value, loan_balance,
                 equity, monthly_rent, loan_payment, asking, owner_full, agent_name,
                 agent_email, agent_phone, owner_cell, owner_email, owner_dnc, raw jsonb)
contacts        (id, org_id, kind, name, email, phone, dnc, ghl_contact_id)   -- dedupe key: (org_id, lower(email))

offers          (id, org_id, property_id, contact_id, mode, target, settings jsonb,
                 creative_ok, cash_ok, values jsonb, status, ghl_opportunity_id, created_at)
offer_versions  (id, offer_id, values jsonb, created_at)                      -- immutable history for negotiation
loi_documents   (id, offer_id, template, storage_path, created_at)

presets         (id, org_id, name, settings jsonb)                            -- "Phoenix Creative", "Vegas Cash"
suppressions    (id, org_id, kind, value, reason, created_at)                 -- opt-outs + already-contacted (dedupe across runs)
campaigns       (id, org_id, name, batch_id, mode, target, count, status, created_at)
```

RLS: everything scoped by `org_id`. `contacts` unique on `(org_id, lower(email))` for cross-run dedupe. **Suppression check** on every export/push: skip any contact whose email/phone is in `suppressions`.

---

## 10. Design system

**Name:** Salvo. **Tagline:** "fire the whole list." **Buyer entity:** BrightPath Real Estate Solutions, LLC.

**Palette (Ordnance):**
| Token | Hex | Use |
|---|---|---|
| ink (gunmetal) | `#1b2228` | dark surfaces: header, stat banner, code/pre |
| ink-2 | `#4a5560` | muted text |
| canvas | `#eceef1` | app background |
| panel | `#ffffff` | cards |
| line | `#d6dbe0` | hairlines |
| gold (accent/orange) | `#e86a2a` | primary action (Blast), hooks, SF Difference, active Offer |
| steel | `#356886` | Target axis, dup badges, secondary accent |
| gain | `#147a54` · loss `#c0392b` · warn (amber) `#c08a2d` | money / status |

**Type:** display + UI = **Space Grotesk**; numerals/data = **IBM Plex Mono** (tabular). Wordmark `SALVO` letter-spaced `.22em`.

**Logo:** rocket blasting through an open-bottom orange ring, black smoke base, white cursor/arrow in the nose (see `salvo_logo_v2.svg` = light bg; `salvo_logo_v2_dark.svg` = bone recolor for dark UI). Header uses the simplified `RocketMark` (in `Salvo.jsx`). Simplified cut = favicon.

**Control color-coding (important UX):** the two segmented controls are color-coded so the active pick pops and the axes are distinguishable — **Target = steel `#356886`** (filled active, steel label + dot), **Offer = orange `#e86a2a`** (filled active, orange label + dot).

**Feel:** light data surfaces with soft shadows (`0 1px 3px rgba(20,30,40,.05)`), gunmetal header with a 2px orange base rule, the app framed in a soft outer shadow. Reserve orange for the launch/blast action.

---

## 11. UI / routes

```
/(app)
  /import            ← upload, smart-map review, enrichment upload, file-kind badge
  /offers            ← the console: Target×Offer, settings, stats, results table, blast   (this is Salvo.jsx today)
  /offers/[id]       ← single-deal Offer Builder: sliders + live financial summary (Cash/SF/SubTo/Lease/Hybrid/Land)
  /campaigns         ← history: past blasts, response tracking (mirrors GHL)
  /templates         ← LOI template editor / preview
  /presets           ← saved settings profiles
  /settings          ← GHL connection, org, suppression list
```

Port `Salvo.jsx` into `/offers` and `/import` (split the import panel out). Componentize: `<SmartImport>`, `<MappingGrid>`, `<ModeControls>` (color-coded segments), `<SettingsPanel>`, `<StatStrip>`, `<ResultsTable>` (mode-aware columns, dup + DNC badges), `<BlastBar>` (CSV export + "Generate PDF"), `<PayloadPreview>`, `<LOIPreview>`.

Results table columns by offer:
- creative → Property/Contact · Rent vs Pmt · Down · **SF Difference** · Status
- cash → Property/Contact · Cash Offer · **Net Cash** · Saved · Status
- both → Property/Contact · SF Difference · Net Cash · Offers (CR/CA badges) · Status

---

## 12. Build order (phased task list for Cursor)

**Phase 0 — scaffold**
- Next.js + TS + Tailwind + shadcn/ui; Supabase project + schema (§9) + RLS; Vercel deploy; auth.

**Phase 1 — engine (pure, tested)**
- `/lib/engine/{mapper,normalize,underwrite,export,format}.ts` per §4–§8. Port from `Salvo.jsx`/`blaster_engine.py`. **Unit-test the math** against the reconciled numbers: e.g. a 343-row PropStream list should qualify counts that match the prototype; foreign PropWire headers must map; duplicate agent emails must group.

**Phase 2 — import + console**
- `/import`: papaparse (client for < ~5k rows, Edge Function for large), smart-map review, enrichment join, persist `import_batches` + `properties`.
- `/offers`: the full console (Target×Offer, settings, stats, reachable filter, dup/DNC badges, results table). CSV export working end-to-end. **This reaches feature parity with the current prototype.**

**Phase 3 — LOI PDF (react-pdf)**
- `<CreativeLOI>` + `<CashLOI>` components rendering §7 fields into the BrightPath layout. Preview modal + download. Store to Supabase Storage (`loi_documents`). "Blast" becomes a choice: **GHL CSV** or **PDF**.

**Phase 4 — GHL API**
- `ghl_connections` + token flow. Upsert contact + custom fields + tag + opportunity + workflow trigger (§8.2). Suppression check on every push. Queue + backoff.

**Phase 5 — durability & scale**
- Suppression list UI + cross-run dedupe. Presets. Campaign history + response sync from GHL. Single-deal Offer Builder (`/offers/[id]`) with the 6 offer types (Cash, Seller Finance, Subject-To, Lease Option, Hybrid, Land) and real amortization for post-reply negotiation.

**Later:** AI mapping fallback (call Claude to map truly unknown headers), PropStream/Zillow API import, DocuSign/Dropbox Sign, Stripe billing.

---

## 13. Reference assets (in this project)

- `Salvo.jsx` — full working front-end + JS engine (mapper, normalize, underwrite, export, modes, dup/DNC, branding). Primary port source for Phases 1–2.
- `blaster_engine.py` — batch engine (mapper + normalize + underwrite + mode routing). Cross-check for the math.
- `salvo_logo_v2.svg` / `salvo_logo_v2_dark.svg` — production logo (light / dark-UI).
- LOI `.docx` templates (creative + cash) — source of the merge-field contract and clause text for the react-pdf rebuild.

## 14. Acceptance criteria

1. Any of PropStream / PropWire / BatchLeads / a novel CSV imports and maps with required-field validation; unmapped required fields are flagged and manually mappable.
2. A skip-trace file enriches a base list by address and enables Direct-to-Seller.
3. Creative & cash offers compute per §4.3; SF Difference sorts the list; degenerate creatives and underwater cash are excluded by the guards.
4. Export CSV headers exactly match the GHL merge-field contract; cash mode omits creative fields; phones are text-safe; DNC and duplicate-contact columns present.
5. LOI PDF renders every merge field with no blanks for the selected offer type.
6. GHL push upserts a contact with custom fields, opportunity, tag, and workflow trigger; suppressed contacts are skipped.
7. Reachable-only filter, DNC badges, and ×N duplicate-contact flags all function.
