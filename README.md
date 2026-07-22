# SALVO — fire the whole list

Salvo is a real-estate **offer-intelligence engine**. It ingests a property list (PropStream / PropWire / BatchLeads / any CSV), underwrites a **creative-finance** and a **cash** offer for every property, and fires personalized Letters of Intent (LOIs) at volume — either to the **listing agent** (Direct-to-Agent) or the **owner** (Direct-to-Seller, via skip-trace).

Salvo is **not a CRM**: GoHighLevel stays the CRM/automation layer. Salvo's job is **analyze → calculate → generate → hand off**, outputting either a GHL-mapped CSV or rendered LOI PDFs.

The full product spec lives in [`SALVO_BUILD.md`](./SALVO_BUILD.md) — it is the source of truth for the math, mapper, export contract, and design system.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Zustand · papaparse · `@react-pdf/renderer` · Vitest.
Supabase (schema in `supabase/migrations/`) and GHL API v2 are the persistence/push layers for later phases.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine unit tests (math, mapper, export contract)
npm run build      # production build
```

## Layout

```
lib/engine/        pure, framework-free engine — runs identically in browser and edge
  mapper.ts        synonym auto-mapping + file classification (spec §5)
  normalize.ts     mapped rows → Property[], DNC-aware phone pick, skip-trace enrich
  underwrite.ts    creative + cash math, tunable Settings (spec §4)
  score.ts         Target×Offer readiness, sort keys, dup/DNC/reachability (spec §6)
  export.ts        GHL-mapped CSV contract (spec §8.1)
  loi.ts           merge-field contract for the LOI templates (spec §7)
lib/store.ts       client session state (upload, mapping, mode, settings, selection)
app/import         upload · smart-map review · enrichment upload · file-kind badge
app/offers         the console: Target×Offer, terms, stats, results table, blast
components/pdf/    Creative + Cash LOI react-pdf templates
supabase/          Postgres schema + RLS (spec §9)
tests/             39 engine tests pinned to the reconciled math
reference/         the two working prototypes this build ports (Salvo.jsx, blaster_engine.py)
```

## Phase status (spec §12)

- ✅ **Phase 0 — scaffold**: Next.js + TS + Tailwind, Supabase schema + RLS SQL
- ✅ **Phase 1 — engine**: pure `/lib/engine/*`, unit-tested against the reconciled numbers
- ✅ **Phase 2 — import + console**: smart map review, enrichment join, full console, CSV export (prototype parity)
- ✅ **Phase 3 — LOI PDF**: `<CreativeLOI>` + `<CashLOI>`, preview modal + download, configurable cash-page append
- ⬜ **Phase 4 — GHL API push**: contact upsert + custom fields + opportunity + workflow trigger, suppression check
- ⬜ **Phase 5 — durability**: Supabase persistence, presets, campaigns, suppression UI, single-deal Offer Builder

Auth, Supabase persistence, and Storage-backed LOI archiving activate once a Supabase project is connected (`.env`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

**Buyer entity on all offers:** BrightPath Real Estate Solutions, LLC (and/or assigns).
