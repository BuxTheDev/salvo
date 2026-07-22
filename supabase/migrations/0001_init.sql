-- Salvo — initial schema (build spec §9)
-- Run via `supabase db push` or the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Organizations, users, GHL connection
-- ---------------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create table ghl_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  access_token text not null,
  location_id text not null,
  custom_field_ids jsonb not null default '{}'::jsonb,
  pipeline_id text,
  stage_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Imports & properties
-- ---------------------------------------------------------------------------

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  filename text not null,
  source_kind text not null default 'base', -- base | enrichment | incomplete
  mapping jsonb not null default '{}'::jsonb,
  row_count integer not null default 0,
  created_by uuid references users (id),
  created_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  batch_id uuid references import_batches (id) on delete cascade,
  address text not null,
  city text,
  state text,
  zip text,
  home_value numeric,
  loan_balance numeric,
  equity numeric,
  monthly_rent numeric,
  loan_payment numeric,
  asking numeric,
  owner_full text,
  agent_name text,
  agent_email text,
  agent_phone text,
  owner_cell text,
  owner_email text,
  owner_dnc boolean not null default false,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index properties_org_id_idx on properties (org_id);
create index properties_batch_id_idx on properties (batch_id);
create index properties_address_idx on properties (org_id, lower(regexp_replace(address, '[^a-zA-Z0-9]', '', 'g')));

-- ---------------------------------------------------------------------------
-- Contacts, offers, LOI documents
-- ---------------------------------------------------------------------------

create table contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  kind text not null default 'owner', -- owner | agent
  name text,
  email text,
  phone text,
  dnc boolean not null default false,
  ghl_contact_id text,
  created_at timestamptz not null default now(),
  unique (org_id, lower(email))
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  property_id uuid not null references properties (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  mode text not null, -- creative | cash | both
  target text not null, -- agent | seller
  settings jsonb not null default '{}'::jsonb,
  creative_ok boolean not null default false,
  cash_ok boolean not null default false,
  values jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  ghl_opportunity_id text,
  created_at timestamptz not null default now()
);

create table offer_versions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers (id) on delete cascade,
  values jsonb not null,
  created_at timestamptz not null default now()
);

create table loi_documents (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers (id) on delete cascade,
  template text not null, -- creative | cash | combined
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Presets, suppressions, campaigns
-- ---------------------------------------------------------------------------

create table presets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  settings jsonb not null,
  created_at timestamptz not null default now()
);

create table suppressions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  kind text not null, -- email | phone
  value text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (org_id, kind, value)
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  batch_id uuid references import_batches (id) on delete set null,
  mode text not null,
  target text not null,
  count integer not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-level security — everything scoped by org_id
-- ---------------------------------------------------------------------------

alter table organizations enable row level security;
alter table users enable row level security;
alter table ghl_connections enable row level security;
alter table import_batches enable row level security;
alter table properties enable row level security;
alter table contacts enable row level security;
alter table offers enable row level security;
alter table offer_versions enable row level security;
alter table loi_documents enable row level security;
alter table presets enable row level security;
alter table suppressions enable row level security;
alter table campaigns enable row level security;

-- Helper: the caller's org, derived from the `users` row matching auth.uid().
create or replace function current_org_id() returns uuid
language sql stable
as $$
  select org_id from users where id = auth.uid()
$$;

create policy "org members can read their organization" on organizations
  for select using (id = current_org_id());

create policy "org members can read their org's users" on users
  for select using (org_id = current_org_id());

create policy "org members can manage their ghl connection" on ghl_connections
  for all using (org_id = current_org_id());

create policy "org members can manage their import batches" on import_batches
  for all using (org_id = current_org_id());

create policy "org members can manage their properties" on properties
  for all using (org_id = current_org_id());

create policy "org members can manage their contacts" on contacts
  for all using (org_id = current_org_id());

create policy "org members can manage their offers" on offers
  for all using (org_id = current_org_id());

create policy "org members can manage their offer versions" on offer_versions
  for all using (
    offer_id in (select id from offers where org_id = current_org_id())
  );

create policy "org members can manage their loi documents" on loi_documents
  for all using (
    offer_id in (select id from offers where org_id = current_org_id())
  );

create policy "org members can manage their presets" on presets
  for all using (org_id = current_org_id());

create policy "org members can manage their suppressions" on suppressions
  for all using (org_id = current_org_id());

create policy "org members can manage their campaigns" on campaigns
  for all using (org_id = current_org_id());
