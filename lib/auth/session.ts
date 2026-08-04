import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { queryDatabase } from "@/lib/db/pool";
import {
  localSessionCookieName,
  localSessionDurationSeconds,
} from "@/lib/auth/constants";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";

export { localSessionCookieName, localSessionDurationSeconds };

type SessionRow = {
  email: string;
  expires_at: Date;
  role_key: RoleKey;
  user_id: string;
};

export type AuthenticatedUser = {
  email: string;
  expiresAt: Date;
  roleKey: RoleKey;
  userId: string;
};

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function createLocalSession(userId: string) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(
    Date.now() + localSessionDurationSeconds * 1_000,
  );

  await queryDatabase(
    `insert into app_auth.sessions (user_id, token_hash, expires_at)
     values ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );

  return { expiresAt, token };
}

export async function revokeLocalSession(token: string | undefined) {
  if (!token) {
    return;
  }

  await queryDatabase(
    `update app_auth.sessions
     set revoked_at = now()
     where token_hash = $1 and revoked_at is null`,
    [hashSessionToken(token)],
  );
}

async function loadAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(localSessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const result = await queryDatabase<SessionRow>(
    `select
       u.id as user_id,
       u.email,
       s.expires_at,
       selected_role.role_key
     from app_auth.sessions s
     join auth.users u on u.id = s.user_id
     join public.profiles p on p.id = u.id
     join lateral (
       select r.key as role_key
       from public.user_roles ur
       join public.roles r on r.id = ur.role_id
       left join public.role_hierarchy rh on rh.role_id = r.id
       where ur.user_id = u.id
         and coalesce(ur.status, 'active') = 'active'
       order by coalesce(rh.hierarchy_level, 0) desc, r.key
       limit 1
     ) selected_role on true
     where s.token_hash = $1
       and s.revoked_at is null
       and s.expires_at > now()
       and p.status = 'active'
       and p.deleted_at is null
     limit 1`,
    [hashSessionToken(token)],
  );
  const row = result.rows[0];

  if (!row || !roleKeys.includes(row.role_key)) {
    return null;
  }

  return {
    email: row.email,
    expiresAt: row.expires_at,
    roleKey: row.role_key,
    userId: row.user_id,
  };
}

export const getAuthenticatedUser = cache(loadAuthenticatedUser);

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user;
}
