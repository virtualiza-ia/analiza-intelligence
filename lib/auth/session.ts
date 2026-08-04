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
  branch_id: string | null;
  can_invite_operational_users: boolean;
  company_id: string | null;
  country_id: string | null;
  email: string;
  expires_at: Date;
  operational_area_id: string | null;
  organization_id: string;
  role_key: RoleKey;
  user_id: string;
};

export type AuthenticatedUser = {
  canInviteOperationalUsers: boolean;
  email: string;
  expiresAt: Date;
  scope: {
    branchId?: string;
    companyId?: string;
    countryId?: string;
    operationalAreaId?: string;
    organizationId: string;
  };
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
       p.organization_id,
       selected_role.role_key,
       selected_role.country_id,
       selected_role.company_id,
       selected_role.operational_area_id,
       selected_role.branch_id,
       selected_role.can_invite_operational_users
     from app_auth.sessions s
     join auth.users u on u.id = s.user_id
     join public.profiles p on p.id = u.id
     join lateral (
       select
         r.key as role_key,
         ur.country_id,
         ur.company_id,
         ur.operational_area_id,
         ur.branch_id,
         exists (
           select 1
           from public.permission_delegations pd
           join public.roles target_role on target_role.id = pd.target_role_id
           where pd.delegator_role_id = ur.role_id
             and target_role.key = 'usuario_operativo'
             and pd.permission_key = 'users.invite'
             and pd.is_enabled
         ) as can_invite_operational_users
       from public.user_roles ur
       join public.roles r on r.id = ur.role_id
       left join public.role_hierarchy rh on rh.role_id = r.id
       where ur.user_id = u.id
         and coalesce(ur.status, 'active') = 'active'
         and ur.organization_id = p.organization_id
       order by coalesce(rh.hierarchy_level, 0) desc, r.key
       limit 1
     ) selected_role on true
     where s.token_hash = $1
       and s.revoked_at is null
       and s.expires_at > now()
       and p.status = 'active'
       and p.deleted_at is null
       and p.organization_id is not null
     limit 1`,
    [hashSessionToken(token)],
  );
  const row = result.rows[0];

  if (!row || !roleKeys.includes(row.role_key)) {
    return null;
  }

  return {
    canInviteOperationalUsers: row.can_invite_operational_users,
    email: row.email,
    expiresAt: row.expires_at,
    scope: {
      ...(row.branch_id ? { branchId: row.branch_id } : {}),
      ...(row.company_id ? { companyId: row.company_id } : {}),
      ...(row.country_id ? { countryId: row.country_id } : {}),
      ...(row.operational_area_id
        ? { operationalAreaId: row.operational_area_id }
        : {}),
      organizationId: row.organization_id,
    },
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
