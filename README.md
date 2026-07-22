# Salvo

**fire the whole list.**

Salvo is a real-estate offer-intelligence engine. It ingests property lists (PropStream / PropWire / BatchLeads / any CSV), underwrites creative-finance and cash offers for every property, and exports GHL-mapped CSVs for blast campaigns.

## Stack

- **Frontend:** Next.js (App Router) · TypeScript · Tailwind
- **Engine:** Pure TypeScript in `src/lib/engine/` — runs identically client-side and server-side
- **CSV:** papaparse

## Getting Started

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # engine unit tests
npm run build    # production build
```

## Routes

| Route | Description |
|---|---|
| `/import` | Upload CSV, smart-map headers, enrichment join |
| `/offers` | Target×Offer console, settings, stats, results table, CSV export |

## Engine

The underwriting math lives in `src/lib/engine/underwrite.ts` and is unit-tested in `src/lib/engine/engine.test.ts`. All mapper, normalize, export, and qualify logic is framework-free.

## Build Phases

- [x] **Phase 0** — Next.js scaffold + design system
- [x] **Phase 1** — Pure engine + tests
- [x] **Phase 2** — Import + Offers console + GHL CSV export
- [ ] **Phase 3** — LOI PDF (`@react-pdf/renderer`)
- [ ] **Phase 4** — GHL API push
- [ ] **Phase 5** — Suppressions, presets, campaigns, Offer Builder

## Buyer Entity

All offers: **BrightPath Real Estate Solutions, LLC (and/or assigns)**
