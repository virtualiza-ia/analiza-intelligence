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

