-- Analiza Intelligence PostgreSQL schema
-- Generated from repository migrations on 2026-08-03.
-- Commit: 51b6130
-- Structure only. Does not include secrets or real patient data.
-- Run on an empty database.

-- Includes vanilla PostgreSQL compatibility bootstrap.

-- Analiza Intelligence
-- Compatibility bootstrap for plain PostgreSQL.
--
-- Use this file only when the target database is NOT Supabase.
-- Supabase already provides auth.users, auth.uid(), and the authenticated/anon roles.

create extension if not exists pgcrypto;

create schema if not exists auth;

do $$
begin
  create role anon nologin;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create role authenticated nologin;
exception
  when duplicate_object then null;
end $$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select case
    when current_setting('request.jwt.claim.sub', true)
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then current_setting('request.jwt.claim.sub', true)::uuid
    else null
  end;
$$;

grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Analiza Intelligence PostgreSQL schema
-- Generated from repository migrations on 2026-08-03.
-- Commit: 51b6130
-- Structure only. Does not include secrets or real patient data.
-- Run on an empty database.

-- ============================================================
-- Migration 1: supabase/migrations/20260720000100_phase1_core.sql
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.currencies (
  id uuid primary key default gen_random_uuid(),
  code char(3) not null unique,
  name text not null,
  symbol text not null,
  decimal_places integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  currency_id uuid not null references public.currencies(id),
  iso2 char(2) not null,
  name text not null,
  time_zone text not null,
  date_format text not null,
  tax_config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, iso2)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  unit_type text not null check (unit_type in ('fisioterapia', 'laboratorio', 'imagenes')),
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  code text not null,
  name text not null,
  city text,
  time_zone text,
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, country_id, company_id, code)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete restrict,
  email text,
  display_name text,
  status text not null default 'invited' check (status in ('invited', 'active', 'suspended')),
  default_country_id uuid references public.countries(id) on delete set null,
  default_company_id uuid references public.companies(id) on delete set null,
  default_branch_id uuid references public.branches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.user_country_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, country_id)
);

create table public.user_company_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create table public.user_branch_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);

create table public.branch_managers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  email text,
  is_demo boolean not null default false,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, company_id, name)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null,
  code text not null,
  name text not null,
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, company_id, code)
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  name text not null,
  source_type text not null check (
    source_type in (
      'api_rest',
      'api_graphql',
      'database',
      'webhook',
      'sftp_file',
      'manual_upload',
      'authorized_scraping',
      'billing_system',
      'crm'
    )
  ),
  status text not null default 'disabled' check (status in ('disabled', 'demo', 'active', 'error')),
  is_demo boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_table text,
  entity_id uuid,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index countries_organization_id_idx on public.countries (organization_id);
create index companies_organization_id_idx on public.companies (organization_id);
create index branches_context_idx on public.branches (organization_id, country_id, company_id);
create index profiles_organization_id_idx on public.profiles (organization_id);
create index user_roles_user_id_idx on public.user_roles (user_id);
create index user_country_access_user_id_idx on public.user_country_access (user_id);
create index user_company_access_user_id_idx on public.user_company_access (user_id);
create index user_branch_access_user_id_idx on public.user_branch_access (user_id);
create index data_sources_context_idx on public.data_sources (organization_id, country_id, company_id, branch_id);
create index audit_logs_context_idx on public.audit_logs (organization_id, country_id, company_id, branch_id, created_at);

create trigger set_organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

create trigger set_currencies_updated_at before update on public.currencies
for each row execute function public.set_updated_at();

create trigger set_countries_updated_at before update on public.countries
for each row execute function public.set_updated_at();

create trigger set_companies_updated_at before update on public.companies
for each row execute function public.set_updated_at();

create trigger set_branches_updated_at before update on public.branches
for each row execute function public.set_updated_at();

create trigger set_roles_updated_at before update on public.roles
for each row execute function public.set_updated_at();

create trigger set_permissions_updated_at before update on public.permissions
for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_branch_managers_updated_at before update on public.branch_managers
for each row execute function public.set_updated_at();

create trigger set_service_categories_updated_at before update on public.service_categories
for each row execute function public.set_updated_at();

create trigger set_services_updated_at before update on public.services
for each row execute function public.set_updated_at();

create trigger set_data_sources_updated_at before update on public.data_sources
for each row execute function public.set_updated_at();

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key = 'webmaster_admin'
  );
$$;

create or replace function public.current_user_has_role(role_keys text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.key = any(role_keys)
  );
$$;

create or replace function public.current_user_can_access_org(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.organization_id = target_organization_id
        and p.status = 'active'
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.organization_id = target_organization_id
    )
    or exists (
      select 1
      from public.user_country_access uca
      join public.countries c on c.id = uca.country_id
      where uca.user_id = auth.uid()
        and c.organization_id = target_organization_id
    )
    or exists (
      select 1
      from public.user_company_access uca
      join public.companies c on c.id = uca.company_id
      where uca.user_id = auth.uid()
        and c.organization_id = target_organization_id
    )
    or exists (
      select 1
      from public.user_branch_access uba
      join public.branches b on b.id = uba.branch_id
      where uba.user_id = auth.uid()
        and b.organization_id = target_organization_id
    );
$$;

create or replace function public.current_user_can_access_country(target_country_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_country_access uca
      where uca.user_id = auth.uid()
        and uca.country_id = target_country_id
    )
    or exists (
      select 1
      from public.user_branch_access uba
      join public.branches b on b.id = uba.branch_id
      where uba.user_id = auth.uid()
        and b.country_id = target_country_id
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.countries c on c.organization_id = ur.organization_id
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and c.id = target_country_id
        and r.key in ('ceo', 'gerente_operaciones')
        and (ur.country_id is null or ur.country_id = target_country_id)
    );
$$;

create or replace function public.current_user_can_access_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_company_access uca
      where uca.user_id = auth.uid()
        and uca.company_id = target_company_id
    )
    or exists (
      select 1
      from public.user_branch_access uba
      join public.branches b on b.id = uba.branch_id
      where uba.user_id = auth.uid()
        and b.company_id = target_company_id
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.key in ('ceo', 'gerente_operaciones')
        and (ur.company_id is null or ur.company_id = target_company_id)
    );
$$;

create or replace function public.current_user_can_access_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_branch_access uba
      where uba.user_id = auth.uid()
        and uba.branch_id = target_branch_id
    )
    or exists (
      select 1
      from public.branches b
      where b.id = target_branch_id
        and (
          public.current_user_can_access_country(b.country_id)
          or public.current_user_can_access_company(b.company_id)
        )
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.key in ('ceo', 'gerente_operaciones', 'gerente_sucursal')
        and (ur.branch_id is null or ur.branch_id = target_branch_id)
    );
$$;

alter table public.organizations enable row level security;
alter table public.currencies enable row level security;
alter table public.countries enable row level security;
alter table public.companies enable row level security;
alter table public.branches enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_country_access enable row level security;
alter table public.user_company_access enable row level security;
alter table public.user_branch_access enable row level security;
alter table public.branch_managers enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.data_sources enable row level security;
alter table public.audit_logs enable row level security;

create policy "read assigned organizations" on public.organizations
for select to authenticated
using (public.current_user_can_access_org(id));

create policy "super admins manage organizations" on public.organizations
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read currencies" on public.currencies
for select to authenticated
using (true);

create policy "super admins manage currencies" on public.currencies
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned countries" on public.countries
for select to authenticated
using (public.current_user_can_access_country(id));

create policy "super admins manage countries" on public.countries
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned companies" on public.companies
for select to authenticated
using (public.current_user_can_access_company(id));

create policy "super admins manage companies" on public.companies
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned branches" on public.branches
for select to authenticated
using (public.current_user_can_access_branch(id));

create policy "super admins manage branches" on public.branches
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "authenticated users read role catalog" on public.roles
for select to authenticated
using (true);

create policy "super admins manage role catalog" on public.roles
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "authenticated users read permission catalog" on public.permissions
for select to authenticated
using (true);

create policy "super admins manage permission catalog" on public.permissions
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "authenticated users read role permissions" on public.role_permissions
for select to authenticated
using (true);

create policy "super admins manage role permissions" on public.role_permissions
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "users read own profile" on public.profiles
for select to authenticated
using (id = auth.uid() or public.current_user_is_super_admin());

create policy "users update own profile basics" on public.profiles
for update to authenticated
using (id = auth.uid() or public.current_user_is_super_admin())
with check (id = auth.uid() or public.current_user_is_super_admin());

create policy "super admins insert profiles" on public.profiles
for insert to authenticated
with check (public.current_user_is_super_admin());

create policy "users read own roles" on public.user_roles
for select to authenticated
using (user_id = auth.uid() or public.current_user_is_super_admin());

create policy "super admins manage user roles" on public.user_roles
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "users read own country access" on public.user_country_access
for select to authenticated
using (user_id = auth.uid() or public.current_user_is_super_admin());

create policy "super admins manage country access" on public.user_country_access
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "users read own company access" on public.user_company_access
for select to authenticated
using (user_id = auth.uid() or public.current_user_is_super_admin());

create policy "super admins manage company access" on public.user_company_access
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "users read own branch access" on public.user_branch_access
for select to authenticated
using (user_id = auth.uid() or public.current_user_is_super_admin());

create policy "super admins manage branch access" on public.user_branch_access
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned branch managers" on public.branch_managers
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "super admins manage branch managers" on public.branch_managers
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned service categories" on public.service_categories
for select to authenticated
using (public.current_user_can_access_company(company_id));

create policy "super admins manage service categories" on public.service_categories
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned services" on public.services
for select to authenticated
using (public.current_user_can_access_company(company_id));

create policy "super admins manage services" on public.services
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned data sources" on public.data_sources
for select to authenticated
using (
  public.current_user_can_access_org(organization_id)
  and (country_id is null or public.current_user_can_access_country(country_id))
  and (company_id is null or public.current_user_can_access_company(company_id))
  and (branch_id is null or public.current_user_can_access_branch(branch_id))
);

create policy "super admins manage data sources" on public.data_sources
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "auditors and admins read audit logs" on public.audit_logs
for select to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['ceo'])
);

create policy "authenticated users insert audit logs" on public.audit_logs
for insert to authenticated
with check (actor_user_id = auth.uid() or public.current_user_is_super_admin());


-- ============================================================
-- Migration 2: supabase/migrations/20260720000200_phase3_operations.sql
-- ============================================================

create table public.appointment_status_catalog (
  key text primary key,
  label text not null,
  is_terminal boolean not null default false,
  is_attended boolean not null default false,
  counts_as_no_show boolean not null default false,
  counts_as_cancelled boolean not null default false,
  counts_as_rescheduled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.appointment_status_catalog (
  key,
  label,
  is_terminal,
  is_attended,
  counts_as_no_show,
  counts_as_cancelled,
  counts_as_rescheduled
)
values
  ('scheduled', 'Scheduled', false, false, false, false, false),
  ('confirmed', 'Confirmed', false, false, false, false, false),
  ('arrived', 'Arrived', false, true, false, false, false),
  ('in_progress', 'In progress', false, true, false, false, false),
  ('completed', 'Completed', true, true, false, false, false),
  ('cancelled_by_patient', 'Cancelled by patient', true, false, false, true, false),
  ('cancelled_by_branch', 'Cancelled by branch', true, false, false, true, false),
  ('no_show', 'No-show', true, false, true, false, false),
  ('rescheduled', 'Rescheduled', true, false, false, false, true),
  ('failed', 'Failed', true, false, false, false, false),
  ('pending', 'Pending', false, false, false, false, false),
  ('unknown', 'Unknown', false, false, false, false, false)
on conflict (key) do update set
  label = excluded.label,
  is_terminal = excluded.is_terminal,
  is_attended = excluded.is_attended,
  counts_as_no_show = excluded.counts_as_no_show,
  counts_as_cancelled = excluded.counts_as_cancelled,
  counts_as_rescheduled = excluded.counts_as_rescheduled;

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  code text not null,
  display_name text not null,
  professional_type text not null default 'clinical',
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, branch_id, code)
);

create table public.professional_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  professional_id uuid references public.professionals(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  available_minutes integer not null check (available_minutes >= 0),
  effective_from date not null,
  effective_to date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.anonymous_patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  anonymous_key text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, anonymous_key)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  source_id uuid references public.data_sources(id) on delete set null,
  import_id uuid,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  external_reference text,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  scheduled_minutes integer not null check (scheduled_minutes >= 0),
  attended_minutes integer check (attended_minutes >= 0),
  normalized_status text not null references public.appointment_status_catalog(key),
  original_status text,
  is_future boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  normalized_status text not null references public.appointment_status_catalog(key),
  original_status text,
  changed_at timestamptz not null default now(),
  source_id uuid references public.data_sources(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.capacity_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  source_id uuid references public.data_sources(id) on delete set null,
  import_id uuid,
  period_start date not null,
  period_end date not null,
  available_minutes integer not null check (available_minutes >= 0),
  scheduled_minutes integer not null default 0 check (scheduled_minutes >= 0),
  attended_minutes integer not null default 0 check (attended_minutes >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  source_id uuid references public.data_sources(id) on delete set null,
  import_id uuid,
  appointment_id uuid references public.appointments(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  performed_at timestamptz not null,
  duration_minutes integer check (duration_minutes >= 0),
  quantity numeric(12, 2) not null default 1,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index professionals_context_idx on public.professionals (organization_id, country_id, company_id, branch_id);
create index professional_schedules_context_idx on public.professional_schedules (organization_id, country_id, company_id, branch_id);
create index anonymous_patients_organization_idx on public.anonymous_patients (organization_id);
create index appointments_context_idx on public.appointments (organization_id, country_id, company_id, branch_id, scheduled_start_at);
create index appointments_status_idx on public.appointments (normalized_status);
create index capacity_records_context_idx on public.capacity_records (organization_id, country_id, company_id, branch_id, period_start, period_end);
create index service_events_context_idx on public.service_events (organization_id, country_id, company_id, branch_id, performed_at);

create trigger set_appointment_status_catalog_updated_at before update on public.appointment_status_catalog
for each row execute function public.set_updated_at();

create trigger set_professionals_updated_at before update on public.professionals
for each row execute function public.set_updated_at();

create trigger set_professional_schedules_updated_at before update on public.professional_schedules
for each row execute function public.set_updated_at();

create trigger set_anonymous_patients_updated_at before update on public.anonymous_patients
for each row execute function public.set_updated_at();

create trigger set_appointments_updated_at before update on public.appointments
for each row execute function public.set_updated_at();

create trigger set_capacity_records_updated_at before update on public.capacity_records
for each row execute function public.set_updated_at();

create trigger set_service_events_updated_at before update on public.service_events
for each row execute function public.set_updated_at();

create or replace function public.safe_ratio(numerator numeric, denominator numeric)
returns numeric
language sql
immutable
as $$
  select case
    when denominator is null or denominator = 0 then null
    else numerator / denominator
  end;
$$;

create or replace view public.v_branch_capacity_summary
with (security_invoker = true) as
select
  organization_id,
  country_id,
  company_id,
  branch_id,
  period_start,
  period_end,
  sum(available_minutes) as available_minutes,
  sum(scheduled_minutes) as scheduled_minutes,
  sum(attended_minutes) as attended_minutes,
  public.safe_ratio(sum(scheduled_minutes), sum(available_minutes)) as scheduled_occupancy,
  public.safe_ratio(sum(attended_minutes), sum(available_minutes)) as effective_occupancy,
  public.safe_ratio(sum(scheduled_minutes), sum(available_minutes))
    - public.safe_ratio(sum(attended_minutes), sum(available_minutes)) as attendance_gap
from public.capacity_records
group by organization_id, country_id, company_id, branch_id, period_start, period_end;

alter table public.appointment_status_catalog enable row level security;
alter table public.professionals enable row level security;
alter table public.professional_schedules enable row level security;
alter table public.anonymous_patients enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_status_history enable row level security;
alter table public.capacity_records enable row level security;
alter table public.service_events enable row level security;

create policy "authenticated users read appointment statuses" on public.appointment_status_catalog
for select to authenticated
using (true);

create policy "super admins manage appointment statuses" on public.appointment_status_catalog
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned professionals" on public.professionals
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "data roles manage professionals" on public.professionals
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned professional schedules" on public.professional_schedules
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "data roles manage professional schedules" on public.professional_schedules
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read anonymous patients by organization" on public.anonymous_patients
for select to authenticated
using (public.current_user_can_access_org(organization_id));

create policy "data roles manage anonymous patients" on public.anonymous_patients
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned appointments" on public.appointments
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "data roles manage appointments" on public.appointments
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned appointment history" on public.appointment_status_history
for select to authenticated
using (
  exists (
    select 1
    from public.appointments a
    where a.id = appointment_id
      and public.current_user_can_access_branch(a.branch_id)
  )
);

create policy "data roles manage appointment history" on public.appointment_status_history
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned capacity records" on public.capacity_records
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "data roles manage capacity records" on public.capacity_records
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned service events" on public.service_events
for select to authenticated
using (public.current_user_can_access_branch(branch_id));

create policy "data roles manage service events" on public.service_events
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);


-- ============================================================
-- Migration 3: supabase/migrations/20260721000100_semantic_ecosystem.sql
-- ============================================================

create table public.business_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  code text not null check (code in ('PHYSIOTHERAPY', 'LABORATORY', 'IMAGING')),
  name text not null,
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, company_id, code)
);

create table public.managers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  display_name text not null,
  manager_type text not null check (manager_type in ('line', 'branch', 'operations', 'finance', 'executive')),
  is_demo boolean not null default false,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.payers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  payer_type text not null default 'private',
  is_enabled boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.date_dimension (
  date_key date primary key,
  year integer not null,
  quarter integer not null,
  month integer not null,
  month_name text not null,
  week integer not null,
  day_of_month integer not null,
  day_of_week integer not null,
  is_weekend boolean not null
);

create table public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text not null,
  business_line_code text not null check (business_line_code in ('CONSOLIDATED', 'PHYSIOTHERAPY', 'LABORATORY', 'IMAGING')),
  category text not null,
  unit text not null,
  format text not null,
  numerator text not null,
  denominator text,
  formula text not null,
  source text not null,
  source_type text not null,
  update_frequency text not null,
  dimensions text[] not null default '{}',
  target numeric,
  threshold_green numeric,
  threshold_yellow numeric,
  threshold_red numeric,
  higher_is_better boolean not null default true,
  data_status text not null check (data_status in ('AVAILABLE', 'PENDING_UPLOAD', 'NOT_CONNECTED', 'INCOMPLETE', 'INVALID', 'DEMO', 'CALCULATED', 'NOT_APPLICABLE')),
  last_updated_at timestamptz,
  owner text,
  drill_down_route text,
  required_fields text[] not null default '{}',
  allowed_roles text[] not null default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  data_source_id uuid references public.data_sources(id) on delete set null,
  template_code text not null,
  source_file text not null,
  source_system text,
  status text not null default 'draft' check (status in ('draft', 'validating', 'preview', 'approved', 'imported', 'failed', 'reversed')),
  imported_by uuid references public.profiles(id) on delete set null,
  imported_at timestamptz,
  row_count integer not null default 0,
  accepted_count integer not null default 0,
  rejected_count integer not null default 0,
  mapping jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.data_quality_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  import_job_id uuid references public.import_jobs(id) on delete cascade,
  source_file text,
  row_number integer,
  column_name text,
  issue_type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  manager_id uuid references public.managers(id) on delete set null,
  period_start date,
  period_end date,
  title text not null,
  summary text not null,
  insight_type text not null check (insight_type in ('risk', 'opportunity', 'anomaly', 'goal', 'quality', 'projection', 'recommendation')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  confidence numeric(5, 2) not null check (confidence >= 0 and confidence <= 1),
  related_kpis text[] not null default '{}',
  detected_cause text,
  financial_impact numeric,
  recommended_action text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'dismissed')),
  owner text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  manager_id uuid references public.managers(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  kpi_code text not null,
  period_start date not null,
  period_end date not null,
  target_value numeric not null,
  suggested_value numeric,
  final_value numeric,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'suggested', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fact_financial (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  payer_id uuid references public.payers(id) on delete set null,
  channel_id uuid references public.channels(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  transaction_date date not null,
  currency_code char(3) not null,
  base_currency_code char(3) not null default 'USD',
  exchange_rate numeric(18, 6) not null default 1,
  gross_revenue numeric(14, 2),
  tax_amount numeric(14, 2),
  discounts numeric(14, 2),
  refunds numeric(14, 2),
  net_revenue numeric(14, 2),
  direct_cost numeric(14, 2),
  operating_expense numeric(14, 2),
  amount_collected numeric(14, 2),
  accounts_receivable numeric(14, 2),
  source_file text,
  row_number integer,
  created_at timestamptz not null default now()
);

create table public.fact_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  goal_id uuid references public.goals(id) on delete cascade,
  kpi_code text not null,
  actual_value numeric,
  target_value numeric,
  period_start date not null,
  period_end date not null,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_data_quality (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  source_id uuid references public.data_sources(id) on delete set null,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  completeness numeric(5, 2),
  validity numeric(5, 2),
  consistency numeric(5, 2),
  uniqueness numeric(5, 2),
  freshness numeric(5, 2),
  referential_integrity numeric(5, 2),
  financial_reconciliation numeric(5, 2),
  measured_at timestamptz not null default now()
);

create table public.fact_customer_experience (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  score numeric(5, 2),
  source text,
  measured_at timestamptz not null default now()
);

create table public.fact_lab_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  payer_id uuid references public.payers(id) on delete set null,
  channel_id uuid references public.channels(id) on delete set null,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  order_number text not null,
  order_status text not null,
  ordered_at timestamptz not null,
  received_at timestamptz,
  billed_at timestamptz,
  collected_at timestamptz,
  source_file text,
  row_number integer,
  created_at timestamptz not null default now(),
  unique (organization_id, order_number)
);

create table public.fact_lab_order_tests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  lab_order_id uuid references public.fact_lab_orders(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  test_code text not null,
  test_name text not null,
  quantity numeric(12, 2) not null default 1,
  price numeric(14, 2),
  direct_cost numeric(14, 2),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.fact_lab_samples (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  lab_order_id uuid references public.fact_lab_orders(id) on delete cascade,
  sample_code text,
  sample_status text,
  taken_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_lab_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  lab_order_test_id uuid references public.fact_lab_order_tests(id) on delete cascade,
  result_status text not null,
  validated_at timestamptz,
  delivered_at timestamptz,
  corrected_at timestamptz,
  critical_value_notified_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_lab_inventory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  item_code text not null,
  item_name text not null,
  item_type text not null check (item_type in ('consumable', 'supply', 'reagent')),
  quantity numeric(14, 2),
  amount numeric(14, 2),
  expires_on date,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_lab_referrals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  doctor_name text not null,
  specialty text,
  department text,
  municipality text,
  assigned_representative text,
  orders_count integer,
  patients_count integer,
  revenue numeric(14, 2),
  last_order_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_medical_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  representative_name text not null,
  doctor_name text not null,
  visited_at timestamptz,
  visit_result text,
  generated_orders integer,
  generated_revenue numeric(14, 2),
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_physio_appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  appointment_status text not null,
  scheduled_at timestamptz not null,
  confirmed_at timestamptz,
  attended_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_physio_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  session_status text not null,
  session_at timestamptz not null,
  attended_minutes integer,
  billed_at timestamptz,
  collected_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_physio_treatment_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  plan_status text not null,
  indicated_sessions integer,
  completed_sessions integer,
  started_on date,
  completed_on date,
  abandoned_on date,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_physio_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  outcome_type text not null,
  initial_value numeric,
  current_value numeric,
  measured_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_imaging_appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  modality text,
  appointment_status text not null,
  scheduled_at timestamptz not null,
  confirmed_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_imaging_studies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  anonymous_patient_id uuid references public.anonymous_patients(id) on delete set null,
  unique_patient_key text,
  equipment_code text,
  modality text not null,
  study_status text not null,
  performed_at timestamptz,
  repeated_at timestamptz,
  repeat_reason text,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_imaging_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  imaging_study_id uuid references public.fact_imaging_studies(id) on delete cascade,
  radiologist_id uuid references public.professionals(id) on delete set null,
  report_status text not null,
  validated_at timestamptz,
  delivered_at timestamptz,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_equipment_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  equipment_code text not null,
  modality text,
  period_start timestamptz not null,
  period_end timestamptz not null,
  available_minutes integer,
  scheduled_minutes integer,
  used_minutes integer,
  downtime_minutes integer,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fact_equipment_maintenance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid references public.countries(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  business_line_id uuid references public.business_lines(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  equipment_code text not null,
  maintenance_type text not null check (maintenance_type in ('scheduled', 'corrective')),
  starts_at timestamptz,
  ends_at timestamptz,
  reason text,
  import_job_id uuid references public.import_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_can_access_semantic_context(
  target_company_id uuid,
  target_branch_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.current_user_is_super_admin()
    or (
      target_branch_id is not null
      and public.current_user_can_access_branch(target_branch_id)
    )
    or (
      target_branch_id is null
      and target_company_id is not null
      and public.current_user_can_access_company(target_company_id)
    );
$$;

create index business_lines_context_idx on public.business_lines (organization_id, company_id, code);
create index managers_context_idx on public.managers (organization_id, country_id, company_id, business_line_id, branch_id);
create index import_jobs_context_idx on public.import_jobs (organization_id, country_id, company_id, business_line_id, branch_id, created_at);
create index insights_context_idx on public.insights (organization_id, country_id, company_id, business_line_id, branch_id, created_at);
create index goals_context_idx on public.goals (organization_id, country_id, company_id, business_line_id, branch_id, period_start);
create index fact_financial_context_idx on public.fact_financial (organization_id, country_id, company_id, business_line_id, branch_id, transaction_date);

create trigger set_business_lines_updated_at before update on public.business_lines
for each row execute function public.set_updated_at();
create trigger set_managers_updated_at before update on public.managers
for each row execute function public.set_updated_at();
create trigger set_channels_updated_at before update on public.channels
for each row execute function public.set_updated_at();
create trigger set_payers_updated_at before update on public.payers
for each row execute function public.set_updated_at();
create trigger set_kpi_definitions_updated_at before update on public.kpi_definitions
for each row execute function public.set_updated_at();
create trigger set_import_jobs_updated_at before update on public.import_jobs
for each row execute function public.set_updated_at();
create trigger set_data_quality_issues_updated_at before update on public.data_quality_issues
for each row execute function public.set_updated_at();
create trigger set_insights_updated_at before update on public.insights
for each row execute function public.set_updated_at();
create trigger set_goals_updated_at before update on public.goals
for each row execute function public.set_updated_at();

alter table public.date_dimension enable row level security;
create policy "authenticated users read date dimension" on public.date_dimension
for select to authenticated using (true);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'business_lines',
    'managers',
    'channels',
    'payers',
    'kpi_definitions',
    'import_jobs',
    'data_quality_issues',
    'insights',
    'goals',
    'fact_financial',
    'fact_goals',
    'fact_data_quality',
    'fact_customer_experience',
    'fact_lab_orders',
    'fact_lab_order_tests',
    'fact_lab_samples',
    'fact_lab_results',
    'fact_lab_inventory',
    'fact_lab_referrals',
    'fact_medical_visits',
    'fact_physio_appointments',
    'fact_physio_sessions',
    'fact_physio_treatment_plans',
    'fact_physio_outcomes',
    'fact_imaging_appointments',
    'fact_imaging_studies',
    'fact_imaging_reports',
    'fact_equipment_usage',
    'fact_equipment_maintenance'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy "read assigned business lines" on public.business_lines
for select to authenticated
using (public.current_user_is_super_admin() or public.current_user_can_access_company(company_id));

create policy "admins manage business lines" on public.business_lines
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned import jobs" on public.import_jobs
for select to authenticated
using (public.current_user_can_access_semantic_context(company_id, branch_id));

create policy "operations manage import jobs" on public.import_jobs
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned insights" on public.insights
for select to authenticated
using (public.current_user_can_access_semantic_context(company_id, branch_id));

create policy "admins and operations manage insights" on public.insights
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

create policy "read assigned goals" on public.goals
for select to authenticated
using (public.current_user_can_access_semantic_context(company_id, branch_id));

create policy "ceo and operations manage goals" on public.goals
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['ceo', 'gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['ceo', 'gerente_operaciones'])
);

create policy "read assigned managers" on public.managers
for select to authenticated
using (
  public.current_user_can_access_org(organization_id)
  and (
    company_id is null
    or public.current_user_can_access_semantic_context(company_id, branch_id)
  )
);

create policy "admins manage managers" on public.managers
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read organization channels" on public.channels
for select to authenticated
using (public.current_user_can_access_org(organization_id));

create policy "admins manage channels" on public.channels
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read organization payers" on public.payers
for select to authenticated
using (public.current_user_can_access_org(organization_id));

create policy "admins manage payers" on public.payers
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read kpi definitions" on public.kpi_definitions
for select to authenticated
using (organization_id is null or public.current_user_can_access_org(organization_id));

create policy "admins manage kpi definitions" on public.kpi_definitions
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assigned data quality issues" on public.data_quality_issues
for select to authenticated
using (public.current_user_can_access_semantic_context(company_id, branch_id));

create policy "operations manage data quality issues" on public.data_quality_issues
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
);

do $$
declare
  fact_table text;
begin
  foreach fact_table in array array[
    'fact_financial',
    'fact_goals',
    'fact_data_quality',
    'fact_customer_experience',
    'fact_lab_orders',
    'fact_lab_order_tests',
    'fact_lab_samples',
    'fact_lab_results',
    'fact_lab_inventory',
    'fact_lab_referrals',
    'fact_medical_visits',
    'fact_physio_appointments',
    'fact_physio_sessions',
    'fact_physio_treatment_plans',
    'fact_physio_outcomes',
    'fact_imaging_appointments',
    'fact_imaging_studies',
    'fact_imaging_reports',
    'fact_equipment_usage',
    'fact_equipment_maintenance'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.current_user_can_access_semantic_context(company_id, branch_id))',
      'read assigned ' || fact_table,
      fact_table
    );

    execute format(
      'create policy %I on public.%I for all to authenticated using (public.current_user_is_super_admin() or public.current_user_has_role(array[''gerente_operaciones''])) with check (public.current_user_is_super_admin() or public.current_user_has_role(array[''gerente_operaciones'']))',
      'operations manage ' || fact_table,
      fact_table
    );
  end loop;
end $$;


-- ============================================================
-- Migration 4: supabase/migrations/20260729000100_area_manager_role.sql
-- ============================================================

insert into public.roles (id, key, name, description)
values
  (
    '60000000-0000-4000-8000-000000000005',
    'gerente_area',
    'Gerente de area',
    'Supervisa un grupo de sucursales asignadas y valida disciplina de carga.'
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('context.read', 'dashboards.read', 'imports.manage')
where r.key = 'gerente_area'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'imports.manage'
where r.key = 'gerente_sucursal'
on conflict do nothing;

create or replace function public.current_user_can_access_country(target_country_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_country_access uca
      where uca.user_id = auth.uid()
        and uca.country_id = target_country_id
    )
    or exists (
      select 1
      from public.user_branch_access uba
      join public.branches b on b.id = uba.branch_id
      where uba.user_id = auth.uid()
        and b.country_id = target_country_id
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.countries c on c.organization_id = ur.organization_id
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and c.id = target_country_id
        and r.key in ('ceo', 'gerente_operaciones', 'gerente_area')
        and (ur.country_id is null or ur.country_id = target_country_id)
    );
$$;

create or replace function public.current_user_can_access_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_company_access uca
      where uca.user_id = auth.uid()
        and uca.company_id = target_company_id
    )
    or exists (
      select 1
      from public.user_branch_access uba
      join public.branches b on b.id = uba.branch_id
      where uba.user_id = auth.uid()
        and b.company_id = target_company_id
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.key in ('ceo', 'gerente_operaciones', 'gerente_area')
        and (ur.company_id is null or ur.company_id = target_company_id)
    );
$$;

create or replace function public.current_user_can_access_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_branch_access uba
      where uba.user_id = auth.uid()
        and uba.branch_id = target_branch_id
    )
    or exists (
      select 1
      from public.branches b
      where b.id = target_branch_id
        and (
          public.current_user_can_access_country(b.country_id)
          or public.current_user_can_access_company(b.company_id)
        )
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.key in ('ceo', 'gerente_operaciones', 'gerente_area', 'gerente_sucursal')
        and (ur.branch_id is null or ur.branch_id = target_branch_id)
    );
$$;


-- ============================================================
-- Migration 5: supabase/migrations/20260729000200_delegated_user_hierarchy.sql
-- ============================================================

alter table public.profiles
  add column if not exists deactivated_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deactivation_reason text,
  add column if not exists invited_by uuid references public.profiles(id) on delete set null;

alter table public.user_roles
  add column if not exists operational_area_id uuid,
  add column if not exists status text not null default 'active'
    check (status in ('pending_invitation', 'active', 'inactive')),
  add column if not exists deactivated_at timestamptz;

alter table public.branches
  add column if not exists operational_area_id uuid,
  add column if not exists status text not null default 'active'
    check (status in ('draft', 'pending_manager', 'active', 'temporarily_closed', 'inactive')),
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.branches
  alter column status set default 'pending_manager';

create table if not exists public.operational_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  manager_profile_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, country_id, company_id, code)
);

alter table public.user_roles
  add constraint user_roles_operational_area_id_fkey
  foreign key (operational_area_id) references public.operational_areas(id) on delete cascade;

alter table public.branches
  add constraint branches_operational_area_id_fkey
  foreign key (operational_area_id) references public.operational_areas(id) on delete set null;

create table if not exists public.area_branch_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operational_area_id uuid not null references public.operational_areas(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.manager_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  country_id uuid references public.countries(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  operational_area_id uuid references public.operational_areas(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending_invitation'
    check (status in ('pending_invitation', 'active', 'inactive')),
  starts_at timestamptz,
  ends_at timestamptz,
  deactivated_at timestamptz,
  reassigned_to_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reporting_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  manager_profile_id uuid not null references public.profiles(id) on delete cascade,
  subordinate_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (manager_profile_id, subordinate_profile_id, starts_at)
);

create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  invited_role_id uuid not null references public.roles(id) on delete restrict,
  invited_by uuid references public.profiles(id) on delete set null,
  country_id uuid references public.countries(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  operational_area_id uuid references public.operational_areas(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invitation_token_hash text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_hierarchy (
  role_id uuid primary key references public.roles(id) on delete cascade,
  role_key text not null unique,
  hierarchy_level integer not null check (hierarchy_level between 0 and 100),
  can_invite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permission_delegations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  delegator_role_id uuid not null references public.roles(id) on delete cascade,
  target_role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null,
  country_id uuid references public.countries(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  operational_area_id uuid references public.operational_areas(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (
    organization_id,
    delegator_role_id,
    target_role_id,
    permission_key,
    country_id,
    company_id,
    operational_area_id,
    branch_id
  )
);

create table if not exists public.assignment_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  entity_table text not null,
  entity_id uuid not null,
  action text not null,
  previous_scope jsonb not null default '{}'::jsonb,
  next_scope jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists area_branch_one_active_assignment_idx
  on public.area_branch_assignments (branch_id)
  where ends_at is null;

create index if not exists operational_areas_context_idx
  on public.operational_areas (organization_id, country_id, company_id);

create index if not exists manager_assignments_scope_idx
  on public.manager_assignments (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    status
  );

create index if not exists user_invitations_scope_idx
  on public.user_invitations (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    status
  );

insert into public.roles (id, key, name, description)
values
  (
    '60000000-0000-4000-8000-000000000000',
    'super_admin',
    'Superadministrador',
    'Administra la plataforma completa, permisos globales y gobierno del BI.'
  ),
  (
    '60000000-0000-4000-8000-000000000006',
    'usuario_operativo',
    'Usuario operativo',
    'Carga y corrige datos operativos sin privilegios gerenciales.'
  ),
  (
    '60000000-0000-4000-8000-000000000007',
    'viewer',
    'Viewer',
    'Consulta informacion autorizada sin permisos de modificacion.'
  )
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.role_hierarchy (role_id, role_key, hierarchy_level, can_invite)
select id, key, hierarchy_level, can_invite
from (
  values
    ('super_admin', 100, true),
    ('webmaster_admin', 100, true),
    ('gerente_operaciones', 80, true),
    ('gerente_area', 60, true),
    ('gerente_sucursal', 40, true),
    ('usuario_operativo', 20, false),
    ('viewer', 10, false)
) as hierarchy(role_key, hierarchy_level, can_invite)
join public.roles r on r.key = hierarchy.role_key
on conflict (role_id) do update set
  role_key = excluded.role_key,
  hierarchy_level = excluded.hierarchy_level,
  can_invite = excluded.can_invite,
  updated_at = now();

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.status = 'active'
      and r.key in ('super_admin', 'webmaster_admin')
  );
$$;

create or replace function public.current_user_max_role_level()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(rh.hierarchy_level), 0)
  from public.user_roles ur
  join public.role_hierarchy rh on rh.role_id = ur.role_id
  where ur.user_id = auth.uid()
    and ur.status = 'active';
$$;

create or replace function public.current_user_can_delegate_role(target_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_roles ur
      join public.role_hierarchy actor_hierarchy
        on actor_hierarchy.role_id = ur.role_id
      join public.role_hierarchy target_hierarchy
        on target_hierarchy.role_id = target_role_id
      where ur.user_id = auth.uid()
        and ur.status = 'active'
        and actor_hierarchy.can_invite
        and actor_hierarchy.hierarchy_level > target_hierarchy.hierarchy_level
    );
$$;

create or replace function public.current_user_can_access_operational_area(
  target_operational_area_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.manager_assignments ma
      where ma.profile_id = auth.uid()
        and ma.status = 'active'
        and ma.operational_area_id = target_operational_area_id
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.operational_areas oa
        on oa.organization_id = ur.organization_id
      where ur.user_id = auth.uid()
        and ur.status = 'active'
        and oa.id = target_operational_area_id
        and (ur.country_id is null or ur.country_id = oa.country_id)
        and (ur.company_id is null or ur.company_id = oa.company_id)
        and (
          ur.operational_area_id is null
          or ur.operational_area_id = target_operational_area_id
        )
    );
$$;

create or replace function public.current_user_can_manage_delegated_scope(
  target_country_id uuid,
  target_company_id uuid,
  target_operational_area_id uuid,
  target_branch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.status = 'active'
        and (ur.country_id is null or ur.country_id = target_country_id)
        and (ur.company_id is null or ur.company_id = target_company_id)
        and (
          target_operational_area_id is null
          or ur.operational_area_id is null
          or ur.operational_area_id = target_operational_area_id
        )
        and (
          target_branch_id is null
          or ur.branch_id is null
          or ur.branch_id = target_branch_id
        )
    );
$$;

create or replace function public.audit_delegation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_record jsonb;
  previous_record jsonb;
  audit_organization_id uuid;
  audit_entity_id uuid;
begin
  next_record := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  previous_record := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  next_record := next_record - 'invitation_token_hash';
  previous_record := previous_record - 'invitation_token_hash';
  audit_organization_id := coalesce(
    (next_record ->> 'organization_id')::uuid,
    (previous_record ->> 'organization_id')::uuid
  );
  audit_entity_id := coalesce(
    (next_record ->> 'id')::uuid,
    (previous_record ->> 'id')::uuid
  );

  insert into public.assignment_history (
    organization_id,
    actor_user_id,
    entity_table,
    entity_id,
    action,
    previous_scope,
    next_scope
  )
  values (
    audit_organization_id,
    auth.uid(),
    tg_table_name,
    audit_entity_id,
    lower(tg_op),
    previous_record,
    next_record
  );

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_table,
    entity_id,
    metadata
  )
  values (
    audit_organization_id,
    auth.uid(),
    'delegation.' || lower(tg_op),
    tg_table_name,
    audit_entity_id,
    jsonb_build_object(
      'previous_scope',
      previous_record,
      'next_scope',
      next_record
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists audit_operational_areas_delegation on public.operational_areas;
create trigger audit_operational_areas_delegation
after insert or update on public.operational_areas
for each row execute function public.audit_delegation_change();

drop trigger if exists audit_area_branch_assignments_delegation
  on public.area_branch_assignments;
create trigger audit_area_branch_assignments_delegation
after insert or update on public.area_branch_assignments
for each row execute function public.audit_delegation_change();

drop trigger if exists audit_manager_assignments_delegation
  on public.manager_assignments;
create trigger audit_manager_assignments_delegation
after insert or update on public.manager_assignments
for each row execute function public.audit_delegation_change();

drop trigger if exists audit_reporting_lines_delegation on public.reporting_lines;
create trigger audit_reporting_lines_delegation
after insert or update on public.reporting_lines
for each row execute function public.audit_delegation_change();

drop trigger if exists audit_user_invitations_delegation on public.user_invitations;
create trigger audit_user_invitations_delegation
after insert or update on public.user_invitations
for each row execute function public.audit_delegation_change();

drop trigger if exists audit_permission_delegations_delegation
  on public.permission_delegations;
create trigger audit_permission_delegations_delegation
after insert or update on public.permission_delegations
for each row execute function public.audit_delegation_change();

drop trigger if exists set_operational_areas_updated_at on public.operational_areas;
create trigger set_operational_areas_updated_at before update on public.operational_areas
for each row execute function public.set_updated_at();

drop trigger if exists set_manager_assignments_updated_at on public.manager_assignments;
create trigger set_manager_assignments_updated_at before update on public.manager_assignments
for each row execute function public.set_updated_at();

drop trigger if exists set_user_invitations_updated_at on public.user_invitations;
create trigger set_user_invitations_updated_at before update on public.user_invitations
for each row execute function public.set_updated_at();

drop trigger if exists set_role_hierarchy_updated_at on public.role_hierarchy;
create trigger set_role_hierarchy_updated_at before update on public.role_hierarchy
for each row execute function public.set_updated_at();

alter table public.operational_areas enable row level security;
alter table public.area_branch_assignments enable row level security;
alter table public.manager_assignments enable row level security;
alter table public.reporting_lines enable row level security;
alter table public.user_invitations enable row level security;
alter table public.role_hierarchy enable row level security;
alter table public.permission_delegations enable row level security;
alter table public.assignment_history enable row level security;

drop policy if exists "super admins manage branches" on public.branches;
create policy "delegated managers manage branches" on public.branches
for all to authenticated
using (
  public.current_user_is_super_admin()
  or (
    public.current_user_has_role(array['gerente_operaciones'])
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      id
    )
  )
)
with check (
  public.current_user_is_super_admin()
  or (
    public.current_user_has_role(array['gerente_operaciones'])
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      id
    )
  )
);

create policy "read assigned operational areas" on public.operational_areas
for select to authenticated
using (
  public.current_user_can_access_operational_area(id)
  or public.current_user_can_access_company(company_id)
);

create policy "operations manage operational areas" on public.operational_areas
for all to authenticated
using (
  public.current_user_is_super_admin()
  or (
    public.current_user_has_role(array['gerente_operaciones'])
    and public.current_user_can_manage_delegated_scope(country_id, company_id, id, null)
  )
)
with check (
  public.current_user_is_super_admin()
  or (
    public.current_user_has_role(array['gerente_operaciones'])
    and public.current_user_can_manage_delegated_scope(country_id, company_id, id, null)
  )
);

create policy "read assigned area branch assignments" on public.area_branch_assignments
for select to authenticated
using (
  public.current_user_can_access_operational_area(operational_area_id)
  or public.current_user_can_access_branch(branch_id)
);

create policy "operations assign branches to areas" on public.area_branch_assignments
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_has_role(array['gerente_operaciones'])
)
with check (
  public.current_user_is_super_admin()
  or (
    public.current_user_has_role(array['gerente_operaciones'])
    and public.current_user_can_access_operational_area(operational_area_id)
    and public.current_user_can_access_branch(branch_id)
  )
);

create policy "read assigned manager assignments" on public.manager_assignments
for select to authenticated
using (
  profile_id = auth.uid()
  or public.current_user_can_manage_delegated_scope(
    country_id,
    company_id,
    operational_area_id,
    branch_id
  )
);

create policy "delegated managers create lower manager assignments"
on public.manager_assignments
for all to authenticated
using (
  public.current_user_is_super_admin()
  or (
    public.current_user_can_delegate_role(role_id)
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      branch_id
    )
  )
)
with check (
  public.current_user_is_super_admin()
  or (
    public.current_user_can_delegate_role(role_id)
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      branch_id
    )
  )
);

create policy "read assigned reporting lines" on public.reporting_lines
for select to authenticated
using (
  manager_profile_id = auth.uid()
  or subordinate_profile_id = auth.uid()
  or public.current_user_can_access_org(organization_id)
);

create policy "delegated managers manage reporting lines" on public.reporting_lines
for all to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_can_access_org(organization_id)
)
with check (
  public.current_user_is_super_admin()
  or public.current_user_can_access_org(organization_id)
);

create policy "read assigned user invitations" on public.user_invitations
for select to authenticated
using (
  invited_by = auth.uid()
  or public.current_user_can_manage_delegated_scope(
    country_id,
    company_id,
    operational_area_id,
    branch_id
  )
);

create policy "delegated managers invite lower roles" on public.user_invitations
for all to authenticated
using (
  public.current_user_is_super_admin()
  or (
    public.current_user_can_delegate_role(invited_role_id)
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      branch_id
    )
  )
)
with check (
  public.current_user_is_super_admin()
  or (
    public.current_user_can_delegate_role(invited_role_id)
    and public.current_user_can_manage_delegated_scope(
      country_id,
      company_id,
      operational_area_id,
      branch_id
    )
  )
);

create policy "authenticated users read role hierarchy" on public.role_hierarchy
for select to authenticated
using (true);

create policy "super admins manage role hierarchy" on public.role_hierarchy
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read permission delegations in scope" on public.permission_delegations
for select to authenticated
using (
  public.current_user_is_super_admin()
  or public.current_user_can_manage_delegated_scope(
    country_id,
    company_id,
    operational_area_id,
    branch_id
  )
);

create policy "super admins manage permission delegations"
on public.permission_delegations
for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

create policy "read assignment history in scope" on public.assignment_history
for select to authenticated
using (public.current_user_can_access_org(organization_id));

create policy "authenticated users record assignment history"
on public.assignment_history
for insert to authenticated
with check (
  actor_user_id = auth.uid()
  or public.current_user_is_super_admin()
);
