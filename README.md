# Salvo

**fire the whole list.**

Salvo is a real-estate offer-intelligence engine. It ingests a property list (PropStream / PropWire / BatchLeads / any CSV), underwrites a **creative-finance** and a **cash** offer for every property, and fires personalized Letters of Intent (LOIs) at volume — either to the listing agent (Direct-to-Agent) or the owner (Direct-to-Seller, via skip-trace).

Salvo is **not a CRM** — GoHighLevel remains the CRM/automation layer. Salvo's job is: analyze → calculate → generate → hand off, via a GHL-mapped CSV or the GHL API, and a rendered LOI PDF.

The full product spec (math, mapping, LOI/export contracts, schema, design system, phased build order) lives in the build doc this repo was generated from.

## Stack

- **Frontend:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · custom shadcn/ui-style component primitives
- **Charts:** Recharts (wired for `/campaigns` reporting) · **PDF:** `@react-pdf/renderer`
- **Backend:** Supabase (Postgres + Auth + Storage) — schema in `supabase/migrations/0001_init.sql`
- **CRM integration:** GoHighLevel API v2 (LeadConnector) — `lib/ghl/`
- **CSV parsing:** `papaparse`
- **State:** Zustand (client-side, persisted to `localStorage`) — see [Current persistence model](#current-persistence-model)
- **Tests:** Vitest

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/offers`.

Other scripts:

```bash
npm run build   # production build
npm run lint    # eslint
npm run test    # vitest (engine unit + integration tests)
```

## Project layout

```
lib/engine/        Pure, framework-free underwriting engine (types, mapper, normalize,
                    underwrite, format, modes, export). Fully unit-tested — this is the
                    module that must run identically in the browser and in a server/Edge
                    context, and it never imports React or Next.js.
lib/ghl/           GoHighLevel API v2 client + Salvo-export-row -> GHL-payload mapping.
                    Server-only; needs a Private Integration token (see Settings page).
lib/store/         Zustand store for the import/offers console session (properties,
                    settings, mode, selection, presets, GHL connection, suppressions).
lib/supabase/      Browser + server Supabase clients. No-op (return null) until
                    NEXT_PUBLIC_SUPABASE_URL / keys are set — see below.
lib/hooks/         useOfferRows — combines properties + settings + mode into the
                    ready/reachable/DNC/duplicate/sorted rows the console renders.

components/ui/     Small local shadcn/ui-style primitives (button, card, table, dialog,
                    select, tabs, switch, slider, checkbox, tooltip, badge, sonner...).
components/salvo/  Product components: SmartImport pieces (MappingGrid, FileKindBadge),
                    the Offers console (ModeControls, SettingsPanel, StatStrip,
                    ResultsTable, BlastBar, PayloadPreview, LOIPreview), AppHeader,
                    RocketMark (brand mark).
components/pdf/    @react-pdf/renderer documents: CreativeLOI (+ appended Cash page)
                    and CashLOI, styled to the Ordnance design system.

app/(app)/import/       Smart CSV import: drag-drop, auto-mapping, review grid,
                        enrichment (skip-trace) merge.
app/(app)/offers/       The console: Target × Offer, settings, stats, results table,
                        CSV blast, LOI preview.
app/(app)/offers/[id]/  Single-deal Offer Builder (Cash + Seller Finance/Subject-To
                        live, with sliders; Lease Option / Hybrid / Land are stubbed).
app/(app)/campaigns/    Stub — campaign history / GHL response sync (Phase 4–5).
app/(app)/templates/    Stub — LOI template editor (Phase 3+).
app/(app)/presets/      Functional — save/apply named underwriting settings profiles.
app/(app)/settings/     GHL connection form + suppression list manager.

supabase/migrations/0001_init.sql   Full schema + RLS for orgs, users, imports,
                                     properties, contacts, offers, LOI documents,
                                     presets, suppressions, campaigns.
```

## The underwriting math

`lib/engine/underwrite.ts` is the source of truth and is transcribed exactly from the build spec — every branch is covered in `lib/engine/underwrite.test.ts` and exercised end-to-end in `lib/engine/integration.test.ts` (mixed-quality PropStream list, a foreign PropWire header set, duplicate-agent grouping, and skip-trace enrichment).

Defaults: 50% of equity as down payment (capped at $30k), 360-month 0%-interest seller carry, $200 payment tolerance vs. rent, 12% assumed traditional selling cost, cash offer at 80% of value. All tunable from the Offers console's Settings panel or saved as a named Preset.

## Current persistence model

There's no live Supabase project connected yet, so the app runs fully client-side: imported properties, settings, mode, selection, presets, the GHL connection form, and the suppression list all live in a Zustand store persisted to `localStorage` (`lib/store/salvo-store.ts`). This mirrors how the original prototype worked and means `/import` → `/offers` → export/LOI works out of the box with **no backend configuration**.

The Supabase schema (`supabase/migrations/0001_init.sql`) and client wrappers (`lib/supabase/`) are in place for when persistence should move server-side (Phase 2 durability / Phase 5 in the build spec): `getSupabaseBrowserClient()` / `getSupabaseServerClient()` return `null` until the env vars below are set, so nothing currently depends on them.

## Environment variables

Copy `.env.example` to `.env.local` and fill in what you have — everything is optional; unset values simply keep the corresponding integration disabled.

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Supabase client (`lib/supabase/client.ts`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase client (`lib/supabase/server.ts`), e.g. for a future batch-import Edge Function |

The GHL Private Integration token is entered per-org from the `/settings` page (stored in the local store today; move it to `ghl_connections` once Supabase is connected).

## GoHighLevel export contract

Two ways to hand off a blast, both defined once in `lib/engine/export.ts`:

1. **CSV** (`exportCsv`) — one row per selected property, column order and merge-tag names exactly matching the GHL custom-field contract; cash-only mode omits the creative columns; phones are normalized to `XXX-XXX-XXXX`; `Tags`, `Pipeline Stage`, `Has Creative`/`Has Cash`, `DNC`, and `Listings For Contact` are all present so a GHL workflow can branch correctly.
2. **API push** (`lib/ghl/client.ts` + `lib/ghl/mapping.ts`) — upsert contact → tag → create opportunity → trigger workflow, with 429 backoff and a sequential queue. Needs `custom_field_ids` (merge tag → GHL custom field ID) captured once per GHL account.

Every export and push path checks the suppression list first (`lib/engine/modes.ts#isSuppressed`).
