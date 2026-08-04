import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { hash } from "bcryptjs";
import type { PoolClient } from "pg";

import { getPasswordPolicyError } from "@/lib/auth/password-policy";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { queryDatabase, withDatabaseTransaction } from "@/lib/db/pool";
import { sendMail } from "@/lib/server/mail";
import type { RoleKey } from "@/lib/tenant/demo-context";
import {
  canInviteUser,
  type ScopeBoundary,
} from "@/lib/tenant/delegation-policy";

const invitationDurationDays = 7;
const passwordResetDurationMinutes = 30;

type InvitationRow = {
  branch_id: string | null;
  company_id: string | null;
  country_id: string | null;
  email: string;
  expires_at: Date;
  full_name: string;
  id: string;
  invited_by: string | null;
  invited_role_id: string;
  operational_area_id: string | null;
  organization_id: string;
  role_key: RoleKey;
  status: "accepted" | "expired" | "pending" | "revoked";
};

export type InvitationScope = {
  branchId?: string;
  companyId?: string;
  countryId?: string;
  operationalAreaId?: string;
};

export type CreateInvitationInput = {
  email: string;
  fullName: string;
  roleKey: RoleKey;
  scope: InvitationScope;
};

function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function appUrl() {
  const value = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (!value) {
    throw new Error("APP_URL is required for authentication emails.");
  }

  return value.replace(/\/+$/, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toActorScope(user: AuthenticatedUser): ScopeBoundary {
  return user.scope;
}

async function validateScope(
  client: PoolClient,
  organizationId: string,
  scope: InvitationScope,
) {
  const result = await client.query<{ valid: boolean }>(
    `select
       ($2::uuid is null or exists (
         select 1 from public.countries
         where id = $2 and organization_id = $1 and is_enabled
       ))
       and ($3::uuid is null or exists (
         select 1 from public.companies
         where id = $3 and organization_id = $1 and is_enabled
       ))
       and ($4::uuid is null or exists (
         select 1 from public.operational_areas
         where id = $4 and organization_id = $1 and status = 'active'
           and ($2::uuid is null or country_id = $2)
           and ($3::uuid is null or company_id = $3)
       ))
       and ($5::uuid is null or exists (
         select 1 from public.branches
         where id = $5 and organization_id = $1 and deleted_at is null
           and ($2::uuid is null or country_id = $2)
           and ($3::uuid is null or company_id = $3)
           and ($4::uuid is null or operational_area_id = $4)
       )) as valid`,
    [
      organizationId,
      scope.countryId ?? null,
      scope.companyId ?? null,
      scope.operationalAreaId ?? null,
      scope.branchId ?? null,
    ],
  );

  return result.rows[0]?.valid === true;
}

function invitationMessage(row: InvitationRow, token: string) {
  const url = new URL("/auth/sign-up", appUrl());
  url.searchParams.set("invitation", token);
  const invitationUrl = url.toString();
  const name = escapeHtml(row.full_name);
  const safeUrl = escapeHtml(invitationUrl);

  return {
    html: `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827"><h2>Invitacion a Analiza Intelligence</h2><p>Hola ${name},</p><p>Tu acceso fue preparado con permisos administrados.</p><p><a href="${safeUrl}" style="display:inline-block;background:#4338ca;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Crear contrasena y activar cuenta</a></p><p>Este enlace vence en ${invitationDurationDays} dias y solo puede utilizarse una vez.</p></div>`,
    subject: "Activa tu cuenta de Analiza Intelligence",
    text: `Hola ${row.full_name},\n\nActiva tu cuenta y crea tu contrasena:\n${invitationUrl}\n\nEl enlace vence en ${invitationDurationDays} dias y solo puede utilizarse una vez.`,
    to: row.email,
  };
}

export async function createInvitation(
  actor: AuthenticatedUser,
  input: CreateInvitationInput,
) {
  if (
    (input.roleKey === "gerente_area" && !input.scope.operationalAreaId) ||
    ((input.roleKey === "gerente_sucursal" || input.roleKey === "usuario_operativo") &&
      !input.scope.branchId)
  ) {
    throw new Error("INVALID_SCOPE");
  }

  const targetScope: ScopeBoundary = {
    ...input.scope,
    organizationId: actor.scope.organizationId,
  };

  if (!canInviteUser({
    roleKey: actor.roleKey,
    scope: toActorScope(actor),
    userId: actor.userId,
    canInviteOperationalUsers: actor.canInviteOperationalUsers,
  }, { roleKey: input.roleKey, scope: targetScope })) {
    throw new Error("INVITATION_FORBIDDEN");
  }

  const token = createOpaqueToken();
  const row = await withDatabaseTransaction(async (client) => {
    const recentInvitations = await client.query<{ count: string }>(
      `select count(*)::text as count from public.user_invitations
       where invited_by = $1 and created_at > now() - interval '1 minute'`,
      [actor.userId],
    );

    if (Number(recentInvitations.rows[0]?.count ?? 0) >= 5) {
      throw new Error("INVITATION_RATE_LIMITED");
    }

    if (!(await validateScope(client, actor.scope.organizationId, input.scope))) {
      throw new Error("INVALID_SCOPE");
    }

    const existingUser = await client.query(
      `select 1 from auth.users where lower(email) = lower($1) limit 1`,
      [input.email],
    );

    if (existingUser.rowCount) {
      throw new Error("ACCOUNT_EXISTS");
    }

    const role = await client.query<{ id: string }>(
      `select id from public.roles where key = $1 limit 1`,
      [input.roleKey],
    );
    const roleId = role.rows[0]?.id;

    if (!roleId) {
      throw new Error("INVALID_ROLE");
    }

    await client.query(
      `update public.user_invitations
       set status = 'revoked', revoked_at = now(), updated_at = now()
       where organization_id = $1 and lower(email) = lower($2)
         and status = 'pending'`,
      [actor.scope.organizationId, input.email],
    );

    const result = await client.query<InvitationRow>(
      `insert into public.user_invitations (
         organization_id, email, invited_role_id, invited_by,
         country_id, company_id, operational_area_id, branch_id,
         invitation_token_hash, metadata
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
       returning id, organization_id, email, invited_role_id, invited_by,
         country_id, company_id, operational_area_id, branch_id, status,
         expires_at, metadata->>'invited_name' as full_name,
         $11::text as role_key`,
      [
        actor.scope.organizationId,
        input.email,
        roleId,
        actor.userId,
        input.scope.countryId ?? null,
        input.scope.companyId ?? null,
        input.scope.operationalAreaId ?? null,
        input.scope.branchId ?? null,
        hashToken(token),
        JSON.stringify({ invited_name: input.fullName }),
        input.roleKey,
      ],
    );

    return result.rows[0];
  });

  if (!row) {
    throw new Error("INVITATION_CREATE_FAILED");
  }

  try {
    await sendMail(invitationMessage(row, token));
    await queryDatabase(
      `update public.user_invitations
       set delivery_status = 'sent', sent_at = now(),
           delivery_error_code = null, updated_at = now()
       where id = $1`,
      [row.id],
    );
  } catch (error: unknown) {
    await queryDatabase(
      `update public.user_invitations
       set delivery_status = 'failed', delivery_error_code = 'smtp_rejected',
           updated_at = now() where id = $1`,
      [row.id],
    );
    throw error;
  }

  return { expiresAt: row.expires_at, id: row.id };
}

export async function getInvitationPreview(token: string) {
  if (!token || token.length > 128) {
    return null;
  }

  const result = await queryDatabase<InvitationRow>(
    `select i.id, i.organization_id, i.email, i.invited_role_id, i.invited_by,
       i.country_id, i.company_id, i.operational_area_id, i.branch_id,
       i.status, i.expires_at, i.metadata->>'invited_name' as full_name,
       r.key as role_key
     from public.user_invitations i
     join public.roles r on r.id = i.invited_role_id
     where i.invitation_token_hash = $1 and i.status = 'pending'
       and i.revoked_at is null and i.expires_at > now()
     limit 1`,
    [hashToken(token)],
  );
  const row = result.rows[0];

  return row
    ? { email: row.email, expiresAt: row.expires_at, fullName: row.full_name }
    : null;
}

async function getManageableInvitation(actor: AuthenticatedUser, invitationId: string) {
  const result = await queryDatabase<InvitationRow>(
    `select i.id, i.organization_id, i.email, i.invited_role_id, i.invited_by,
       i.country_id, i.company_id, i.operational_area_id, i.branch_id,
       i.status, i.expires_at, i.metadata->>'invited_name' as full_name,
       r.key as role_key
     from public.user_invitations i
     join public.roles r on r.id = i.invited_role_id
     where i.id = $1 and i.organization_id = $2 limit 1`,
    [invitationId, actor.scope.organizationId],
  );
  const row = result.rows[0];

  if (!row || !canInviteUser({
    roleKey: actor.roleKey,
    scope: actor.scope,
    userId: actor.userId,
    canInviteOperationalUsers: actor.canInviteOperationalUsers,
  }, {
    roleKey: row.role_key,
    scope: {
      branchId: row.branch_id ?? undefined,
      companyId: row.company_id ?? undefined,
      countryId: row.country_id ?? undefined,
      operationalAreaId: row.operational_area_id ?? undefined,
      organizationId: row.organization_id,
    },
  })) {
    throw new Error("INVITATION_FORBIDDEN");
  }

  return row;
}

export async function revokeInvitation(actor: AuthenticatedUser, invitationId: string) {
  const row = await getManageableInvitation(actor, invitationId);

  if (row.status !== "pending") {
    throw new Error("INVITATION_NOT_PENDING");
  }

  await queryDatabase(
    `update public.user_invitations set status = 'revoked', revoked_at = now(),
       updated_at = now() where id = $1 and status = 'pending'`,
    [row.id],
  );
}

export async function resendInvitation(actor: AuthenticatedUser, invitationId: string) {
  const row = await getManageableInvitation(actor, invitationId);

  if (row.status !== "pending") {
    throw new Error("INVITATION_NOT_PENDING");
  }

  const token = createOpaqueToken();
  await queryDatabase(
    `update public.user_invitations set invitation_token_hash = $2,
       expires_at = now() + make_interval(days => $3),
       delivery_status = 'pending', delivery_error_code = null,
       updated_at = now() where id = $1 and status = 'pending'`,
    [row.id, hashToken(token), invitationDurationDays],
  );

  try {
    await sendMail(invitationMessage(row, token));
    await queryDatabase(
      `update public.user_invitations set delivery_status = 'sent',
         sent_at = now(), updated_at = now() where id = $1`,
      [row.id],
    );
  } catch (error: unknown) {
    await queryDatabase(
      `update public.user_invitations set delivery_status = 'failed',
         delivery_error_code = 'smtp_rejected', updated_at = now() where id = $1`,
      [row.id],
    );
    throw error;
  }
}

export async function acceptInvitation(token: string, password: string) {
  const policyError = getPasswordPolicyError(password);

  if (policyError) {
    throw new Error(policyError);
  }

  const passwordHash = await hash(password, 12);

  return withDatabaseTransaction(async (client) => {
    const result = await client.query<InvitationRow>(
      `select i.id, i.organization_id, i.email, i.invited_role_id, i.invited_by,
         i.country_id, i.company_id, i.operational_area_id, i.branch_id,
         i.status, i.expires_at, i.metadata->>'invited_name' as full_name,
         r.key as role_key
       from public.user_invitations i
       join public.roles r on r.id = i.invited_role_id
       where i.invitation_token_hash = $1
       for update of i`,
      [hashToken(token)],
    );
    const invitation = result.rows[0];

    if (
      !invitation ||
      invitation.status !== "pending" ||
      invitation.expires_at.getTime() <= Date.now()
    ) {
      throw new Error("INVITATION_INVALID");
    }

    const user = await client.query<{ id: string }>(
      `insert into auth.users (
         email, encrypted_password, email_confirmed_at,
         raw_user_meta_data, updated_at
       ) values ($1,$2,now(),$3::jsonb,now()) returning id`,
      [
        invitation.email,
        passwordHash,
        JSON.stringify({ display_name: invitation.full_name }),
      ],
    );
    const userId = user.rows[0]?.id;

    if (!userId) {
      throw new Error("ACCOUNT_CREATE_FAILED");
    }

    await client.query(
      `insert into public.profiles (
         id, organization_id, email, display_name, status, invited_by
       ) values ($1,$2,$3,$4,'active',$5)`,
      [
        userId,
        invitation.organization_id,
        invitation.email,
        invitation.full_name,
        invitation.invited_by,
      ],
    );
    await client.query(
      `insert into app_auth.accounts (user_id, password_hash)
       values ($1,$2)`,
      [userId, passwordHash],
    );
    await client.query(
      `insert into public.user_roles (
         user_id, role_id, organization_id, country_id, company_id,
         operational_area_id, branch_id, status
       ) values ($1,$2,$3,$4,$5,$6,$7,'active')`,
      [
        userId,
        invitation.invited_role_id,
        invitation.organization_id,
        invitation.country_id,
        invitation.company_id,
        invitation.operational_area_id,
        invitation.branch_id,
      ],
    );
    await client.query(
      `update public.user_invitations
       set status = 'accepted', accepted_at = now(), updated_at = now()
       where id = $1`,
      [invitation.id],
    );

    return userId;
  });
}

export async function requestPasswordReset(email: string) {
  const account = await queryDatabase<{ email: string; user_id: string }>(
    `select u.email, a.user_id
     from app_auth.accounts a
     join auth.users u on u.id = a.user_id
     join public.profiles p on p.id = a.user_id
     where lower(u.email) = lower($1) and p.status = 'active'
       and p.deleted_at is null limit 1`,
    [email],
  );
  const row = account.rows[0];

  if (!row) {
    return;
  }

  const token = createOpaqueToken();
  const resetCreated = await withDatabaseTransaction(async (client) => {
    const recent = await client.query(
      `select 1 from app_auth.password_reset_tokens
       where user_id = $1 and created_at > now() - interval '1 minute'
       limit 1`,
      [row.user_id],
    );

    if (recent.rowCount) {
      return false;
    }

    await client.query(
      `update app_auth.password_reset_tokens set revoked_at = now()
       where user_id = $1 and used_at is null and revoked_at is null`,
      [row.user_id],
    );
    await client.query(
      `insert into app_auth.password_reset_tokens
         (user_id, token_hash, expires_at)
       values ($1,$2,now() + make_interval(mins => $3))`,
      [row.user_id, hashToken(token), passwordResetDurationMinutes],
    );
    return true;
  });

  if (!resetCreated) {
    return;
  }

  const url = new URL("/auth/update-password", appUrl());
  url.searchParams.set("token", token);
  const safeUrl = escapeHtml(url.toString());

  await sendMail({
    html: `<p>Solicitaste restablecer tu contrasena de Analiza Intelligence.</p><p><a href="${safeUrl}">Crear nueva contrasena</a></p><p>El enlace vence en ${passwordResetDurationMinutes} minutos.</p>`,
    subject: "Restablece tu contrasena de Analiza Intelligence",
    text: `Restablece tu contrasena: ${url.toString()}\nEl enlace vence en ${passwordResetDurationMinutes} minutos.`,
    to: row.email,
  });
}

export async function resetPassword(token: string, password: string) {
  const policyError = getPasswordPolicyError(password);

  if (policyError) {
    throw new Error(policyError);
  }

  const passwordHash = await hash(password, 12);

  await withDatabaseTransaction(async (client) => {
    const result = await client.query<{ id: string; user_id: string }>(
      `select id, user_id from app_auth.password_reset_tokens
       where token_hash = $1 and used_at is null and revoked_at is null
         and expires_at > now() for update`,
      [hashToken(token)],
    );
    const reset = result.rows[0];

    if (!reset) {
      throw new Error("RESET_TOKEN_INVALID");
    }

    await client.query(
      `update app_auth.accounts set password_hash = $2,
         password_changed_at = now(), failed_login_attempts = 0,
         locked_until = null, updated_at = now() where user_id = $1`,
      [reset.user_id, passwordHash],
    );
    await client.query(
      `update auth.users set encrypted_password = $2, updated_at = now()
       where id = $1`,
      [reset.user_id, passwordHash],
    );
    await client.query(
      `update app_auth.sessions set revoked_at = now()
       where user_id = $1 and revoked_at is null`,
      [reset.user_id],
    );
    await client.query(
      `update app_auth.password_reset_tokens set used_at = now()
       where id = $1`,
      [reset.id],
    );
  });
}
