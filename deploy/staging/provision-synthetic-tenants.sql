\if :{?shared_password}
\else
  \quit 3
\endif

begin;

insert into public.organizations (id, name, slug, is_demo)
values (
  '11000000-0000-4000-8000-000000000002',
  'Organizacion B STAGING DEMO',
  'organizacion-b-staging-demo',
  true
)
on conflict (slug) do nothing;

insert into public.countries (
  id, organization_id, currency_id, iso2, name, time_zone, date_format,
  tax_config, is_demo
)
values (
  '31000000-0000-4000-8000-000000000002',
  '11000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003',
  'SV', 'El Salvador STAGING DEMO', 'America/El_Salvador', 'dd/MM/yyyy',
  '{"staging":true}', true
)
on conflict (organization_id, iso2) do nothing;

insert into public.companies (
  id, organization_id, key, name, unit_type, is_demo
)
values (
  '41000000-0000-4000-8000-000000000002',
  '11000000-0000-4000-8000-000000000002',
  'fisioterapia-staging-demo', 'Fisioterapia B STAGING DEMO', 'fisioterapia', true
)
on conflict (id) do update set
  key = excluded.key,
  name = excluded.name,
  unit_type = excluded.unit_type,
  is_demo = true;

insert into public.branches (
  id, organization_id, country_id, company_id, code, name, city, time_zone,
  is_demo, status
)
values (
  '51000000-0000-4000-8000-000000000002',
  '11000000-0000-4000-8000-000000000002',
  '31000000-0000-4000-8000-000000000002',
  '41000000-0000-4000-8000-000000000002',
  'STG-B-FIS-001', 'Sucursal B STAGING DEMO', 'San Salvador',
  'America/El_Salvador', true, 'active'
)
on conflict (id) do update set
  organization_id = excluded.organization_id,
  country_id = excluded.country_id,
  company_id = excluded.company_id,
  code = excluded.code,
  name = excluded.name,
  city = excluded.city,
  time_zone = excluded.time_zone,
  is_demo = true,
  status = 'active';

insert into public.operational_areas (
  id, organization_id, country_id, company_id, code, name, description, status
)
values
  (
    '81000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000004',
    '40000000-0000-4000-8000-000000000001',
    'STG-A', 'Area A STAGING DEMO', 'Datos sinteticos', 'active'
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    '11000000-0000-4000-8000-000000000002',
    '31000000-0000-4000-8000-000000000002',
    '41000000-0000-4000-8000-000000000002',
    'STG-B', 'Area B STAGING DEMO', 'Datos sinteticos', 'active'
  )
on conflict (id) do update set
  organization_id = excluded.organization_id,
  country_id = excluded.country_id,
  company_id = excluded.company_id,
  code = excluded.code,
  name = excluded.name,
  description = excluded.description,
  status = excluded.status;

update public.branches
set operational_area_id = '81000000-0000-4000-8000-000000000001',
    status = 'active'
where id = '50000000-0000-4000-8000-000000000001';

update public.branches
set operational_area_id = '81000000-0000-4000-8000-000000000002'
where id = '51000000-0000-4000-8000-000000000002';

create temporary table staging_account_specs (
  tenant_key text,
  organization_id uuid,
  country_id uuid,
  company_id uuid,
  operational_area_id uuid,
  branch_id uuid,
  role_key text,
  email text
) on commit drop;

insert into staging_account_specs
select
  tenant.tenant_key,
  tenant.organization_id,
  tenant.country_id,
  tenant.company_id,
  tenant.operational_area_id,
  tenant.branch_id,
  role.key,
  role.key || '.' || tenant.tenant_key || '@staging.invalid'
from (
  values
    (
      'tenant-a',
      '10000000-0000-4000-8000-000000000001'::uuid,
      '30000000-0000-4000-8000-000000000004'::uuid,
      '40000000-0000-4000-8000-000000000001'::uuid,
      '81000000-0000-4000-8000-000000000001'::uuid,
      '50000000-0000-4000-8000-000000000001'::uuid
    ),
    (
      'tenant-b',
      '11000000-0000-4000-8000-000000000002'::uuid,
      '31000000-0000-4000-8000-000000000002'::uuid,
      '41000000-0000-4000-8000-000000000002'::uuid,
      '81000000-0000-4000-8000-000000000002'::uuid,
      '51000000-0000-4000-8000-000000000002'::uuid
    )
) as tenant(
  tenant_key, organization_id, country_id, company_id, operational_area_id,
  branch_id
)
cross join (
  values
    ('super_admin'), ('webmaster_admin'), ('ceo'), ('gerente_operaciones'),
    ('gerente_area'), ('gerente_sucursal'), ('usuario_operativo'), ('viewer')
) as role(key);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
select gen_random_uuid(), spec.email, now(), '{"staging":true,"demo":true}'
from staging_account_specs spec
on conflict (email) do nothing;

insert into public.profiles (
  id, organization_id, email, display_name, status, default_country_id,
  default_company_id, default_branch_id
)
select
  users.id, spec.organization_id, spec.email,
  spec.role_key || ' ' || spec.tenant_key || ' STAGING DEMO', 'active',
  spec.country_id, spec.company_id, spec.branch_id
from staging_account_specs spec
join auth.users users on users.email = spec.email
on conflict (id) do update set
  status = 'active',
  deleted_at = null,
  default_country_id = excluded.default_country_id,
  default_company_id = excluded.default_company_id,
  default_branch_id = excluded.default_branch_id;

insert into app_auth.accounts (user_id, password_hash)
select users.id, crypt(:'shared_password', gen_salt('bf', 12))
from staging_account_specs spec
join auth.users users on users.email = spec.email
on conflict (user_id) do update set
  password_hash = excluded.password_hash,
  failed_login_attempts = 0,
  locked_until = null,
  updated_at = now();

insert into public.user_roles (
  user_id, role_id, organization_id, country_id, company_id,
  operational_area_id, branch_id, status
)
select
  users.id,
  roles.id,
  spec.organization_id,
  case when spec.role_key in ('super_admin', 'webmaster_admin') then null else spec.country_id end,
  case when spec.role_key in ('super_admin', 'webmaster_admin', 'ceo') then null else spec.company_id end,
  case when spec.role_key = 'gerente_area' then spec.operational_area_id else null end,
  case when spec.role_key in ('gerente_sucursal', 'usuario_operativo', 'viewer') then spec.branch_id else null end,
  'active'
from staging_account_specs spec
join auth.users users on users.email = spec.email
join public.roles roles on roles.key = spec.role_key
where not exists (
  select 1
  from public.user_roles existing
  where existing.user_id = users.id
    and existing.role_id = roles.id
    and existing.organization_id = spec.organization_id
);

update public.user_roles assignment
set country_id = case
      when spec.role_key in ('super_admin', 'webmaster_admin') then null
      else spec.country_id
    end,
    company_id = case
      when spec.role_key in ('super_admin', 'webmaster_admin', 'ceo') then null
      else spec.company_id
    end,
    operational_area_id = case
      when spec.role_key = 'gerente_area' then spec.operational_area_id
      else null
    end,
    branch_id = case
      when spec.role_key in ('gerente_sucursal', 'usuario_operativo', 'viewer')
        then spec.branch_id
      else null
    end,
    status = 'active'
from staging_account_specs spec
join auth.users users on users.email = spec.email
join public.roles roles on roles.key = spec.role_key
where assignment.user_id = users.id
  and assignment.role_id = roles.id
  and assignment.organization_id = spec.organization_id;

delete from public.user_branch_access access
using staging_account_specs spec, auth.users users
where users.email = spec.email
  and access.user_id = users.id;

insert into public.user_branch_access (user_id, branch_id)
select users.id, spec.branch_id
from staging_account_specs spec
join auth.users users on users.email = spec.email
where spec.role_key in ('gerente_sucursal', 'usuario_operativo', 'viewer')
on conflict do nothing;

commit;
