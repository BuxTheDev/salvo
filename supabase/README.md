# Supabase setup for Salvo

## 1. Secrets / env — where they go
The render service (`server/`) runs as a **Node/Express process on the Cursor VM**, so it reads plain environment variables. Put these in the **Cursor Cloud Agent Secrets panel** (right of the agent page) or a local `.env` — NOT in Supabase Edge Function secrets (those only auto-inject into Supabase's own Edge runtime, which this service does not use).

- `SUPABASE_URL` — e.g. `https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-side only; never ship to the browser).
  The newer `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_KEY`) is also accepted.
- `SUPABASE_LOI_BUCKET` — optional, defaults to `loi`
- `SUPABASE_SIGNED_URL_TTL` — optional, signed-URL lifetime in seconds (default 7 days)

Secrets are injected into a **new** agent session, so add them, then start a fresh session and run `npm run supabase:check`.

## 2. Storage bucket
Create a **private** bucket named `loi` (Storage → New bucket, keep "Public" off). The service uploads rendered PDFs there and returns time-limited signed URLs.

## 3. Database schema
Apply `migrations/0001_init_schema.sql` via the Supabase SQL editor (paste + run) or the CLI:

```
supabase db push
```

RLS is enabled on every table; the service uses the service-role key (which bypasses RLS). Add org-scoped policies once auth is wired.
