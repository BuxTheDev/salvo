# Salvo

**fire the whole list.**

Offer-intelligence engine for creative-finance and cash LOIs. Ingest a property CSV → underwrite → export GHL-mapped contacts / LOI PDFs.

Buyer entity on all offers: **BrightPath Real Estate Solutions, LLC (and/or assigns)**.

## Stack

- Next.js (App Router) · TypeScript · Tailwind
- Pure engine in `src/lib/engine` (browser + edge identical)
- Supabase schema in `supabase/schema.sql`
- Vitest for underwriting / mapper / export contracts

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Import** a CSV (try `public/sample-propstream.csv`) → **Offers** → Export GHL CSV.

```bash
npm test
npm run build
```

## Build phases

| Phase | Status |
|---|---|
| 0 Scaffold | Done |
| 1 Engine (mapper, underwrite, export) + tests | Done |
| 2 Import + Offers console (prototype parity) | Done (client-side) |
| 3 LOI PDF (react-pdf) | Next |
| 4 GHL API push | Planned |
| 5 Durability, presets, campaigns, offer builder | Planned |

Full product spec: see the build document handed to Cursor (`SALVO_BUILD`).

## Engine

```ts
import { underwrite, DEFAULT_SETTINGS } from "@/lib/engine";
```

Math, GHL column contract, and mapper synonyms are locked to the build spec. Where prototype and doc disagree, the doc wins.
