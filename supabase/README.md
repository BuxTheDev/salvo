# Supabase setup for Salvo

## 1. Secrets / env
The render service (`server/`) switches from local-disk storage to Supabase Storage automatically when these are set (add them as Cursor secrets or a local `.env`):

- `SUPABASE_URL` — e.g. `https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-side only; never ship to the browser)
- `SUPABASE_LOI_BUCKET` — optional, defaults to `loi`
- `SUPABASE_SIGNED_URL_TTL` — optional, signed-URL lifetime in seconds (default 7 days)

## 2. Storage bucket
Create a **private** bucket named `loi` (Storage → New bucket, keep "Public" off). The service uploads rendered PDFs there and returns time-limited signed URLs.

## 3. Database schema
Apply `migrations/0001_init_schema.sql` via the Supabase SQL editor (paste + run) or the CLI:

```
supabase db push
```

RLS is enabled on every table; the service uses the service-role key (which bypasses RLS). Add org-scoped policies once auth is wired.
