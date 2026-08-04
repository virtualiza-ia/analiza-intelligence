alter table public.user_invitations
  alter column invitation_token_hash set not null,
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed')),
  add column if not exists delivery_error_code text,
  add column if not exists sent_at timestamptz;

create unique index if not exists user_invitations_one_pending_email_idx
  on public.user_invitations (organization_id, lower(email))
  where status = 'pending';

create index if not exists user_invitations_token_hash_idx
  on public.user_invitations (invitation_token_hash)
  where status = 'pending';

create unique index if not exists auth_users_email_lower_idx
  on auth.users (lower(email))
  where email is not null;

create table app_auth.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index app_auth_password_reset_user_idx
  on app_auth.password_reset_tokens (user_id, created_at desc);

grant select, insert, update on app_auth.password_reset_tokens to service_role;

comment on table app_auth.password_reset_tokens is
  'Server-only, single-use password recovery tokens. Only SHA-256 token hashes are stored.';
