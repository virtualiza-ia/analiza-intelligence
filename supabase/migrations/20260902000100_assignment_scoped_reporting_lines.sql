alter table if exists public.reporting_lines
  add column if not exists country_id uuid references public.countries(id) on delete cascade,
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists operational_area_id uuid references public.operational_areas(id) on delete cascade,
  add column if not exists branch_id uuid references public.branches(id) on delete cascade;

create index if not exists reporting_lines_scope_idx
  on public.reporting_lines (
    organization_id,
    country_id,
    company_id,
    operational_area_id,
    branch_id,
    status
  );

with ranked_reporting_lines as (
  select
    id,
    row_number() over (
      partition by
        manager_profile_id,
        subordinate_profile_id,
        organization_id,
        country_id,
        company_id,
        operational_area_id,
        branch_id
      order by starts_at desc nulls last, created_at desc, id desc
    ) as row_number
  from public.reporting_lines
  where status = 'active'
)
update public.reporting_lines rl
set status = 'inactive',
    ends_at = coalesce(rl.ends_at, now())
from ranked_reporting_lines ranked
where rl.id = ranked.id
  and ranked.row_number > 1;

create unique index if not exists reporting_lines_one_active_scope_idx
  on public.reporting_lines (
    manager_profile_id,
    subordinate_profile_id,
    organization_id,
    coalesce(country_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(operational_area_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status = 'active';

comment on column public.reporting_lines.country_id is
  'Pais del alcance operativo de esta relacion de reporte. Permite que una misma persona tenga relaciones distintas por asignacion.';

comment on column public.reporting_lines.company_id is
  'Linea o compania del alcance operativo de esta relacion de reporte. No representa un rol.';

comment on column public.reporting_lines.operational_area_id is
  'Gerencia de area del alcance operativo de esta relacion de reporte.';

comment on column public.reporting_lines.branch_id is
  'Sucursal de la asignacion operativa cuando la relacion es especifica de sucursal; puede ser null para alcance de area.';
