import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

import { getPostgresPool } from "@/lib/server/database";
import {
  getPasswordPolicyError,
  hashPassword,
  verifyPassword,
} from "@/lib/server/passwords";
import type { CurrentUserScope } from "@/lib/tenant/current-user-access";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";

type InvitationActivationRow = {
  branch_id: string | null;
  company_id: string | null;
  country_id: string | null;
  email: string;
  id: string;
  invited_by: string | null;
  invited_role_id: string;
  metadata: Record<string, unknown> | string | null;
  operational_area_id: string | null;
  organization_id: string;
  role_key: string;
};

type LocalAuthUserRow = {
  email: string;
  encrypted_password: string | null;
  id: string;
  profile_status: string | null;
  role_key: string | null;
};

type LocalUserScopeRow = {
  branch_city: string | null;
  branch_code: string | null;
  branch_id: string | null;
  branch_name: string | null;
  company_id: string | null;
  company_name: string | null;
  country_id: string | null;
  country_name: string | null;
  email: string;
  id: string;
  operational_area_id: string | null;
  operational_area_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
  role_key: string | null;
};

export type AuthenticatedLocalUser = {
  email: string;
  roleKey: RoleKey;
  scope?: CurrentUserScope;
  userId: string;
};

export type AcceptInvitationInput = {
  email: string;
  password: string;
  token: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseMetadata(metadata: InvitationActivationRow["metadata"]) {
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  return metadata ?? {};
}

function getDisplayName(invitation: InvitationActivationRow) {
  const metadata = parseMetadata(invitation.metadata);
  const invitedName = metadata.invited_name;

  if (typeof invitedName === "string" && invitedName.trim()) {
    return invitedName.trim();
  }

  return invitation.email.split("@")[0] ?? "Usuario Analiza";
}

function coerceRoleKey(value: string | null | undefined): RoleKey {
  return roleKeys.includes(value as RoleKey)
    ? (value as RoleKey)
    : "viewer";
}

async function ensureActiveUserRole(
  client: PoolClient,
  userId: string,
  invitation: InvitationActivationRow,
) {
  const roleScopeValues = [
    userId,
    invitation.invited_role_id,
    invitation.organization_id,
    invitation.country_id,
    invitation.company_id,
    invitation.operational_area_id,
    invitation.branch_id,
  ];

  const existingRole = await client.query<{ id: string }>(
    `
      select id
      from public.user_roles
      where user_id = $1
        and role_id = $2
        and organization_id = $3
        and country_id is not distinct from $4
        and company_id is not distinct from $5
        and operational_area_id is not distinct from $6
        and branch_id is not distinct from $7
      limit 1
    `,
    roleScopeValues,
  );
  const existingRoleId = existingRole.rows[0]?.id;

  if (existingRoleId) {
    await client.query(
      `
        update public.user_roles
        set status = 'active',
            deactivated_at = null
        where id = $1
      `,
      [existingRoleId],
    );
    return;
  }

  await client.query(
    `
      insert into public.user_roles (
        user_id,
        role_id,
        organization_id,
        country_id,
        company_id,
        operational_area_id,
        branch_id,
        status
      )
      values ($1, $2, $3, $4, $5, $6, $7, 'active')
    `,
    roleScopeValues,
  );
}

async function grantScopedAccess(
  client: PoolClient,
  userId: string,
  invitation: InvitationActivationRow,
) {
  if (invitation.country_id) {
    await client.query(
      `
        insert into public.user_country_access (user_id, country_id)
        values ($1, $2)
        on conflict (user_id, country_id) do nothing
      `,
      [userId, invitation.country_id],
    );
  }

  if (invitation.company_id) {
    await client.query(
      `
        insert into public.user_company_access (user_id, company_id)
        values ($1, $2)
        on conflict (user_id, company_id) do nothing
      `,
      [userId, invitation.company_id],
    );
  }

  if (invitation.branch_id) {
    await client.query(
      `
        insert into public.user_branch_access (user_id, branch_id)
        values ($1, $2)
        on conflict (user_id, branch_id) do nothing
      `,
      [userId, invitation.branch_id],
    );
  }
}

export async function acceptUserInvitation({
  email,
  password,
  token,
}: AcceptInvitationInput): Promise<AuthenticatedLocalUser> {
  const normalizedEmail = normalizeEmail(email);
  const passwordPolicyError = getPasswordPolicyError(password);

  if (passwordPolicyError) {
    throw new Error(passwordPolicyError);
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const invitationResult = await client.query<InvitationActivationRow>(
      `
        select
          ui.id,
          ui.organization_id,
          ui.email,
          ui.invited_role_id,
          ui.invited_by,
          ui.country_id,
          ui.company_id,
          ui.operational_area_id,
          ui.branch_id,
          ui.metadata,
          r.key as role_key
        from public.user_invitations ui
        join public.roles r on r.id = ui.invited_role_id
        where lower(ui.email) = $1
          and ui.invitation_token_hash = $2
          and ui.status = 'pending'
          and ui.expires_at > now()
        for update
        limit 1
      `,
      [normalizedEmail, hashInvitationToken(token)],
    );
    const invitation = invitationResult.rows[0];

    if (!invitation) {
      throw new Error("La invitacion no existe, vencio o ya fue usada.");
    }

    const encryptedPassword = await hashPassword(password);
    const userResult = await client.query<{ email: string; id: string }>(
      `
        insert into auth.users (
          email,
          encrypted_password,
          email_confirmed_at
        )
        values ($1, $2, now())
        on conflict (email) do update
        set encrypted_password = excluded.encrypted_password,
            email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
            updated_at = now()
        returning id, email
      `,
      [normalizedEmail, encryptedPassword],
    );
    const user = userResult.rows[0];

    if (!user) {
      throw new Error("No se pudo activar el usuario.");
    }

    await client.query(
      `
        insert into public.profiles (
          id,
          organization_id,
          email,
          display_name,
          status,
          default_country_id,
          default_company_id,
          default_branch_id,
          invited_by
        )
        values ($1, $2, $3, $4, 'active', $5, $6, $7, $8)
        on conflict (id) do update
        set organization_id = excluded.organization_id,
            email = excluded.email,
            display_name = excluded.display_name,
            status = 'active',
            default_country_id = excluded.default_country_id,
            default_company_id = excluded.default_company_id,
            default_branch_id = excluded.default_branch_id,
            invited_by = coalesce(public.profiles.invited_by, excluded.invited_by),
            deactivated_at = null,
            deleted_at = null,
            updated_at = now()
      `,
      [
        user.id,
        invitation.organization_id,
        normalizedEmail,
        getDisplayName(invitation),
        invitation.country_id,
        invitation.company_id,
        invitation.branch_id,
        invitation.invited_by,
      ],
    );

    await ensureActiveUserRole(client, user.id, invitation);
    await grantScopedAccess(client, user.id, invitation);

    await client.query(
      `
        update public.user_invitations
        set status = 'accepted',
            accepted_at = now(),
            invitation_token_hash = null
        where id = $1
      `,
      [invitation.id],
    );

    await client.query(
      `
        insert into public.audit_logs (
          organization_id,
          actor_user_id,
          action,
          entity_table,
          entity_id,
          country_id,
          company_id,
          branch_id,
          metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        invitation.organization_id,
        user.id,
        "user_invitation.accepted",
        "user_invitations",
        invitation.id,
        invitation.country_id,
        invitation.company_id,
        invitation.branch_id,
        JSON.stringify({
          accepted_email_domain: normalizedEmail.split("@")[1] ?? "unknown",
          role_key: invitation.role_key,
          source: "invitation-activation",
        }),
      ],
    );

    await client.query("commit");

    return {
      email: user.email,
      roleKey: coerceRoleKey(invitation.role_key),
      userId: user.id,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function authenticateLocalUser({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthenticatedLocalUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const pool = getPostgresPool();
  const result = await pool.query<LocalAuthUserRow>(
    `
      select
        u.id,
        u.email,
        u.encrypted_password,
        p.status as profile_status,
        r.key as role_key
      from auth.users u
      join public.profiles p on p.id = u.id
      left join public.user_roles ur
        on ur.user_id = p.id
        and coalesce(ur.status, 'active') = 'active'
        and ur.deactivated_at is null
      left join public.roles r on r.id = ur.role_id
      where lower(u.email) = $1
        and p.status = 'active'
        and p.deactivated_at is null
        and p.deleted_at is null
      order by
        case r.key
          when 'super_admin' then 1
          when 'webmaster_admin' then 2
          when 'ceo' then 3
          when 'gerente_operaciones' then 4
          when 'gerente_area' then 5
          when 'gerente_sucursal' then 6
          when 'usuario_operativo' then 7
          else 8
        end
      limit 1
    `,
    [normalizedEmail],
  );
  const user = result.rows[0];

  if (
    !user?.encrypted_password ||
    user.profile_status !== "active" ||
    !(await verifyPassword(password, user.encrypted_password))
  ) {
    return null;
  }

  return {
    email: user.email,
    roleKey: coerceRoleKey(user.role_key),
    userId: user.id,
  };
}

function buildCurrentUserScope(row: LocalUserScopeRow): CurrentUserScope {
  return {
    branchCity: row.branch_city,
    branchCode: row.branch_code,
    branchId: row.branch_id,
    branchName: row.branch_name,
    companyId: row.company_id,
    companyName: row.company_name,
    countryId: row.country_id,
    countryName: row.country_name,
    operationalAreaId: row.operational_area_id,
    operationalAreaName: row.operational_area_name,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
  };
}

export async function getAuthenticatedLocalUserAccess(userId: string) {
  const pool = getPostgresPool();
  const result = await pool.query<LocalUserScopeRow>(
    `
      select
        u.id,
        u.email,
        r.key as role_key,
        coalesce(ur.organization_id, p.organization_id) as organization_id,
        o.name as organization_name,
        coalesce(ur.country_id, p.default_country_id, b.country_id) as country_id,
        c.name as country_name,
        coalesce(ur.company_id, p.default_company_id, b.company_id) as company_id,
        co.name as company_name,
        coalesce(ur.operational_area_id, b.operational_area_id) as operational_area_id,
        oa.name as operational_area_name,
        coalesce(ur.branch_id, p.default_branch_id) as branch_id,
        b.name as branch_name,
        b.code as branch_code,
        b.city as branch_city
      from auth.users u
      join public.profiles p on p.id = u.id
      left join public.user_roles ur
        on ur.user_id = p.id
        and coalesce(ur.status, 'active') = 'active'
        and ur.deactivated_at is null
      left join public.roles r on r.id = ur.role_id
      left join public.branches b
        on b.id = coalesce(ur.branch_id, p.default_branch_id)
      left join public.organizations o
        on o.id = coalesce(ur.organization_id, p.organization_id)
      left join public.countries c
        on c.id = coalesce(ur.country_id, p.default_country_id, b.country_id)
      left join public.companies co
        on co.id = coalesce(ur.company_id, p.default_company_id, b.company_id)
      left join public.operational_areas oa
        on oa.id = coalesce(ur.operational_area_id, b.operational_area_id)
      where u.id = $1
        and p.status = 'active'
        and p.deactivated_at is null
        and p.deleted_at is null
      order by
        case r.key
          when 'super_admin' then 1
          when 'webmaster_admin' then 2
          when 'ceo' then 3
          when 'gerente_operaciones' then 4
          when 'gerente_area' then 5
          when 'gerente_sucursal' then 6
          when 'usuario_operativo' then 7
          else 8
        end
      limit 1
    `,
    [userId],
  );
  const user = result.rows[0];

  if (!user) {
    return null;
  }

  return {
    email: user.email,
    roleKey: coerceRoleKey(user.role_key),
    scope: buildCurrentUserScope(user),
    userId: user.id,
  } satisfies AuthenticatedLocalUser;
}
