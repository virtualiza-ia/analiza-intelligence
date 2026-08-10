alter table public.profiles
  add column if not exists requires_password_change boolean not null default false;

create index if not exists profiles_requires_password_change_idx
  on public.profiles (requires_password_change)
  where requires_password_change = true;
