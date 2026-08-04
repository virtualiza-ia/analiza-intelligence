create table public.manual_monthly_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  country_id uuid not null references public.countries(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  business_line text not null check (business_line in ('Laboratorio', 'Fisioterapia', 'Imagenes')),
  period date not null check (period = date_trunc('month', period)::date),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'VALIDATION_FAILED', 'PUBLISHED', 'REPLACED')),
  active_version integer not null default 1 check (active_version > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, branch_id, business_line, period)
);

create table public.manual_monthly_submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.manual_monthly_submissions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  validation_results jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_results) = 'array'),
  quality_score integer not null check (quality_score between 0 and 100),
  status text not null check (status in ('DRAFT', 'VALIDATION_FAILED', 'PUBLISHED', 'REPLACED')),
  source_type text not null default 'MANUAL_FORM' check (source_type in ('MANUAL_FORM', 'FILE_UPLOAD', 'CONNECTOR')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  published_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (submission_id, version_number)
);

create table public.manual_monthly_submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.manual_monthly_submissions(id) on delete cascade,
  version_id uuid references public.manual_monthly_submission_versions(id) on delete set null,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('DRAFT_SAVED', 'VALIDATION_FAILED', 'PUBLISHED', 'REPLACED')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index manual_monthly_submissions_context_idx
  on public.manual_monthly_submissions (organization_id, company_id, branch_id, period desc);
create index manual_monthly_versions_submission_idx
  on public.manual_monthly_submission_versions (submission_id, version_number desc);
create index manual_monthly_events_submission_idx
  on public.manual_monthly_submission_events (submission_id, created_at desc);

comment on table public.manual_monthly_submissions is
  'Canonical monthly manual-ingestion identity. Published data is immutable and corrected through a new version.';
comment on column public.manual_monthly_submission_versions.answers is
  'Server-validated form values only; patient PII and credentials are prohibited.';
