-- Salvo — initial schema (spec §9). Everything is org-scoped with RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- orgs & users
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table users (
  id      uuid primary key references auth.users (id) on delete cascade,
  org_id  uuid not null references organizations (id) on delete cascade,
  email   text not null,
  role    text not null default 'member' check (role in ('owner', 'admin', 'member'))
);

create table ghl_connections (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations (id) on delete cascade,
  access_token      text not null,
  location_id       text not null,
  custom_field_ids  jsonb not null default '{}'::jsonb,
  pipeline_id       text,
  stage_id          text
);

-- ---------------------------------------------------------------- imports & properties
create table import_batches (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations (id) on delete cascade,
  filename     text not null,
  source_kind  text not null check (source_kind in ('base', 'enrichment', 'incomplete')),
  mapping      jsonb not null default '{}'::jsonb,
  row_count    integer not null default 0,
  created_by   uuid references users (id),
  created_at   timestamptz not null default now()
);

create table properties (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations (id) on delete cascade,
  batch_id      uuid references import_batches (id) on delete set null,
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
  owner_dnc     boolean not null default false,
  raw           jsonb
);
create index properties_org_batch_idx on properties (org_id, batch_id);

create table contacts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations (id) on delete cascade,
  kind            text not null check (kind in ('agent', 'owner')),
  name            text,
  email           text,
  phone           text,
  dnc             boolean not null default false,
  ghl_contact_id  text
);
-- cross-run dedupe key
create unique index contacts_org_email_idx on contacts (org_id, lower(email)) where email is not null;

-- ---------------------------------------------------------------- offers & LOIs
create table offers (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizations (id) on delete cascade,
  property_id         uuid not null references properties (id) on delete cascade,
  contact_id          uuid references contacts (id) on delete set null,
  mode                text not null check (mode in ('creative', 'cash', 'both')),
  target              text not null check (target in ('agent', 'seller')),
  settings            jsonb not null,
  creative_ok         boolean not null default false,
  cash_ok             boolean not null default false,
  values              jsonb not null,
  status              text not null default 'offer_ready',
  ghl_opportunity_id  text,
  created_at          timestamptz not null default now()
);

-- immutable history for negotiation
create table offer_versions (
  id          uuid primary key default gen_random_uuid(),
  offer_id    uuid not null references offers (id) on delete cascade,
  values      jsonb not null,
  created_at  timestamptz not null default now()
);

create table loi_documents (
  id            uuid primary key default gen_random_uuid(),
  offer_id      uuid not null references offers (id) on delete cascade,
  template      text not null check (template in ('creative', 'cash', 'combined')),
  storage_path  text not null,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- presets, suppressions, campaigns
create table presets (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references organizations (id) on delete cascade,
  name      text not null,
  settings  jsonb not null
);

-- opt-outs + already-contacted (dedupe across runs); checked on every export/push
create table suppressions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  kind        text not null check (kind in ('email', 'phone')),
  value       text not null,
  reason      text,
  created_at  timestamptz not null default now()
);
create unique index suppressions_org_value_idx on suppressions (org_id, kind, lower(value));

create table campaigns (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations (id) on delete cascade,
  name        text not null,
  batch_id    uuid references import_batches (id) on delete set null,
  mode        text not null check (mode in ('creative', 'cash', 'both')),
  target      text not null check (target in ('agent', 'seller')),
  count       integer not null default 0,
  status      text not null default 'draft',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS: everything scoped by org_id
create or replace function current_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from users where id = auth.uid()
$$;

alter table organizations   enable row level security;
alter table users           enable row level security;
alter table ghl_connections enable row level security;
alter table import_batches  enable row level security;
alter table properties      enable row level security;
alter table contacts        enable row level security;
alter table offers          enable row level security;
alter table offer_versions  enable row level security;
alter table loi_documents   enable row level security;
alter table presets         enable row level security;
alter table suppressions    enable row level security;
alter table campaigns       enable row level security;

create policy org_read  on organizations for select using (id = current_org_id());
create policy users_self on users for select using (org_id = current_org_id());

create policy ghl_all      on ghl_connections for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy batches_all  on import_batches  for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy props_all    on properties      for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy contacts_all on contacts        for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy offers_all   on offers          for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy presets_all  on presets         for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy suppr_all    on suppressions    for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy camps_all    on campaigns       for all using (org_id = current_org_id()) with check (org_id = current_org_id());

create policy versions_all on offer_versions for all
  using (exists (select 1 from offers o where o.id = offer_id and o.org_id = current_org_id()))
  with check (exists (select 1 from offers o where o.id = offer_id and o.org_id = current_org_id()));

create policy lois_all on loi_documents for all
  using (exists (select 1 from offers o where o.id = offer_id and o.org_id = current_org_id()))
  with check (exists (select 1 from offers o where o.id = offer_id and o.org_id = current_org_id()));
