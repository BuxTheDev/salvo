-- Salvo schema (Supabase / Postgres)
-- RLS: everything scoped by org_id

create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists ghl_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  access_token text not null,
  location_id text,
  custom_field_ids jsonb not null default '{}'::jsonb,
  pipeline_id text,
  stage_id text,
  created_at timestamptz not null default now(),
  unique (org_id)
);

create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  filename text,
  source_kind text,
  mapping jsonb,
  row_count int not null default 0,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  batch_id uuid references import_batches(id) on delete set null,
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

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind text check (kind in ('agent', 'seller')),
  name text,
  email text,
  phone text,
  dnc boolean not null default false,
  ghl_contact_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists contacts_org_email_uidx
  on contacts (org_id, lower(email))
  where email is not null;

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  mode text not null check (mode in ('creative', 'cash', 'both')),
  target text not null check (target in ('agent', 'seller')),
  settings jsonb not null default '{}'::jsonb,
  creative_ok boolean not null default false,
  cash_ok boolean not null default false,
  values jsonb not null default '{}'::jsonb,
  status text not null default 'ready',
  ghl_opportunity_id text,
  created_at timestamptz not null default now()
);

create table if not exists offer_versions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  values jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists loi_documents (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  template text not null check (template in ('creative', 'cash', 'combined')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists presets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  settings jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists suppressions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind text not null check (kind in ('email', 'phone')),
  value text not null,
  reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists suppressions_org_kind_value_uidx
  on suppressions (org_id, kind, lower(value));

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  batch_id uuid references import_batches(id) on delete set null,
  mode text,
  target text,
  count int not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

-- RLS helpers
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

create or replace function public.user_org_id()
returns uuid
language sql
stable
as $$
  select org_id from public.users where id = auth.uid()
$$;

-- Example policies (org-scoped). Apply similarly to each table with org_id.
create policy org_select_properties on properties
  for select using (org_id = public.user_org_id());
create policy org_insert_properties on properties
  for insert with check (org_id = public.user_org_id());
create policy org_update_properties on properties
  for update using (org_id = public.user_org_id());
create policy org_delete_properties on properties
  for delete using (org_id = public.user_org_id());
