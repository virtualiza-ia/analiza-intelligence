create schema if not exists app_auth;

revoke all on schema app_auth from public;
grant usage on schema app_auth to service_role;

create table app_auth.accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  password_hash text not null,
  failed_login_attempts integer not null default 0 check (failed_login_attempts >= 0),
  locked_until timestamptz,
  password_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app_auth.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index app_auth_sessions_active_token_idx
  on app_auth.sessions (token_hash, expires_at)
  where revoked_at is null;

create index app_auth_sessions_user_id_idx
  on app_auth.sessions (user_id, created_at desc);

insert into app_auth.accounts (user_id, password_hash)
select id, encrypted_password
from auth.users
where encrypted_password is not null
  and encrypted_password <> ''
on conflict (user_id) do nothing;

grant select, insert, update on app_auth.accounts to service_role;
grant select, insert, update, delete on app_auth.sessions to service_role;

comment on schema app_auth is
  'Server-only local authentication data. Never expose this schema to browser clients.';

comment on column app_auth.accounts.password_hash is
  'Adaptive password hash only. Plaintext passwords must never be stored or logged.';

comment on column app_auth.sessions.token_hash is
  'SHA-256 hash of an opaque session token. The raw token exists only in the secure cookie.';
