# Salvo — fire the whole list

Salvo is a real-estate **offer-intelligence engine**. It ingests a property list
(PropStream / PropWire / BatchLeads / any CSV), underwrites a **creative-finance**
and a **cash** offer for every property, and generates personalized Letters of
Intent (LOIs) at volume — either to the listing **agent** (Direct-to-Agent) or the
**owner** (Direct-to-Seller, via skip-trace enrichment).

Salvo is **not a CRM**. Its job is: **analyze → calculate → generate → hand off.**
It outputs either (a) a GoHighLevel-mapped CSV or (b) a rendered LOI PDF.

The persuasion hook is the **Seller Finance Difference**: how much more a seller
nets selling creatively vs. a traditional MLS sale after ~12% selling costs. That
number is the sort key and the headline of every creative LOI.

**Buyer entity on all offers:** BrightPath Real Estate Solutions, LLC (and/or assigns).

---

## What's implemented

This build covers the spec's Phases 0–3 as a fully client-side, self-contained app
(no external credentials required to run):

- **Pure engine** (`src/lib/engine/`, framework-free, unit-tested) — runs identically
  in the browser and on the server:
  - `underwrite.ts` — the exact underwriting math (creative + cash) and contact resolution.
  - `mapper.ts` — smart CSV header → canonical field mapping (exact-then-fuzzy),
    file classification (`base` / `enrichment` / `incomplete`).
  - `normalize.ts` — normalization, DNC-aware phone selection, skip-trace enrichment join.
  - `select.ts` — Target × Offer modes, readiness, sort keys, contactability,
    DNC + duplicate-contact flags.
  - `export.ts` — the GHL-mapped CSV contract (text-safe phones, mode-aware columns).
  - `loi.ts` / `format.ts` — LOI merge-field contract and currency formatting (`fcT`/`fcS`).
- **`/import`** — smart-map review with a per-field mapping grid (auto/guess/set tags),
  file-kind badge, required-field validation, and optional enrichment upload.
- **`/offers`** — the console: color-coded Target (steel) / Offer (orange) controls,
  tunable underwriting settings, a stat strip, a mode-aware results table with ×N
  duplicate and DNC badges, a reachable-only filter, GHL CSV export, batch PDF
  generation, and a GHL payload preview.
- **`/templates`** — live LOI preview against a sample deal.
- **LOI PDF** (`@react-pdf/renderer`) — Creative (Subject-To + Seller Finance) and Cash
  templates in the BrightPath layout; creative sends can include the cash page (configurable).

### Deferred (need credentials / external services)

Phases 4–5 are structured for but not wired, since they require secrets:
Supabase persistence + RLS, the GoHighLevel API push (contact upsert, custom fields,
opportunity, workflow trigger, suppression + backoff), Resend email, campaign history,
and the single-deal Offer Builder (`/offers/[id]`).

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Open `/import`, click **load a sample PropStream list** (or upload your own CSV),
review the mapping, then **Load into console** to underwrite and export.

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
npm run test     # vitest (engine math, mapping, dedupe, export, PDF render)
```

## Tech stack

Next.js (App Router) · TypeScript · Tailwind v4 · `@react-pdf/renderer` · `papaparse` ·
Vitest. Design system "Ordnance": Space Grotesk (UI) + IBM Plex Mono (data).
