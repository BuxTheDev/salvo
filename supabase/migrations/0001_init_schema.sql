-- Salvo initial schema (SALVO_BUILD.md §9).
-- Apply via the Supabase SQL editor or `supabase db push`.
-- The render service uses the service-role key (bypasses RLS); RLS is enabled
-- on every table and org-scoped policies should be added once auth is wired.

create extension if not exists pgcrypto;

create table if not exists organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id      uuid primary key default gen_random_uuid(),
  org_id  uuid references organizations(id) on delete cascade,
  email   text,
  role    text
);

create table if not exists ghl_connections (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references organizations(id) on delete cascade,
  access_token     text,
  location_id      text,
  custom_field_ids jsonb,
  pipeline_id      text,
  stage_id         text,
  created_at       timestamptz not null default now()
);

create table if not exists import_batches (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  filename    text,
  source_kind text,
  mapping     jsonb,
  row_count   integer,
  created_by  uuid references users(id),
  created_at  timestamptz not null default now()
);

create table if not exists properties (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references organizations(id) on delete cascade,
  batch_id      uuid references import_batches(id) on delete set null,
  address       text not null,
  city          text,
  state         text,
  zip           text,
  home_value    numeric,
  loan_balance  numeric,
  equity        numeric,
  monthly_rent  numeric,
  loan_payment  numeric,
  asking        numeric,
  owner_full    text,
  agent_name    text,
  agent_email   text,
  agent_phone   text,
  owner_cell    text,
  owner_email   text,
  owner_dnc     boolean default false,
  raw           jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists properties_org_batch_idx on properties(org_id, batch_id);

create table if not exists contacts (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references organizations(id) on delete cascade,
  kind           text,
  name           text,
  email          text,
  phone          text,
  dnc            boolean default false,
  ghl_contact_id text,
  created_at     timestamptz not null default now()
);
-- Cross-run dedupe key: one contact per lowercased email per org.
create unique index if not exists contacts_org_email_uidx
  on contacts(org_id, lower(email)) where email is not null;

create table if not exists offers (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organizations(id) on delete cascade,
  property_id       uuid references properties(id) on delete cascade,
  contact_id        uuid references contacts(id) on delete set null,
  mode              text,          -- creative | cash | both
  target            text,          -- agent | seller
  settings          jsonb,
  creative_ok       boolean,
  cash_ok           boolean,
  values            jsonb,         -- the computed merge fields
  status            text default 'offer_ready',
  ghl_opportunity_id text,
  created_at        timestamptz not null default now()
);
create index if not exists offers_org_property_idx on offers(org_id, property_id);

create table if not exists offer_versions (
  id         uuid primary key default gen_random_uuid(),
  offer_id   uuid references offers(id) on delete cascade,
  values     jsonb,
  created_at timestamptz not null default now()
);

create table if not exists campaigns (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade,
  name       text,
  batch_id   uuid references import_batches(id) on delete set null,
  mode       text,
  target     text,
  count      integer,
  status     text,
  created_at timestamptz not null default now()
);

create table if not exists loi_documents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organizations(id) on delete cascade,
  offer_id     uuid references offers(id) on delete cascade,
  campaign_id  uuid references campaigns(id) on delete set null,
  template     text,          -- creative | cash
  storage_path text,          -- object key in the `loi` bucket
  status       text default 'rendered',
  created_at   timestamptz not null default now()
);
create index if not exists loi_documents_offer_idx on loi_documents(offer_id);

create table if not exists presets (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade,
  name       text,
  settings   jsonb,
  created_at timestamptz not null default now()
);

create table if not exists suppressions (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade,
  kind       text,          -- email | phone
  value      text,
  reason     text,
  created_at timestamptz not null default now()
);
create index if not exists suppressions_org_value_idx on suppressions(org_id, kind, value);

-- Enable RLS everywhere. Add org-scoped policies once auth is wired; the
-- service-role key used by the render service bypasses RLS.
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','users','ghl_connections','import_batches','properties',
    'contacts','offers','offer_versions','campaigns','loi_documents','presets','suppressions'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;
