import { createHash, randomBytes } from "node:crypto";

import { getPostgresPool } from "@/lib/server/database";
import { demoRoleProfiles, type RoleKey } from "@/lib/tenant/demo-context";
import type { ScopeBoundary } from "@/lib/tenant/delegation-policy";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RoleRow = {
  id: string;
};

type InvitationRow = {
  expires_at: string;
  id: string;
};

const assignmentTrackedRoles: RoleKey[] = ["gerente_area", "gerente_sucursal"];

export type CreateInvitationInput = {
  appUrl: string;
  actorUserId: string;
  email: string;
  fullName: string;
  roleKey: RoleKey;
  scope: ScopeBoundary;
};

export type CreatedInvitation = {
  emailHtml: string;
  emailText: string;
  expiresAt: string;
  id: string;
  recipientEmail: string;
  subject: string;
};

function nullableUuid(value: string | null | undefined) {
  return value && uuidPattern.test(value) ? value : null;
}

function requiredUuid(value: string | null | undefined, fieldName: string) {
  const uuid = nullableUuid(value);

  if (!uuid) {
    throw new Error(`${fieldName} must be a valid UUID.`);
  }

  return uuid;
}

function normalizeAppUrl(appUrl: string) {
  return appUrl.replace(/\/+$/, "");
}

function buildInvitationUrl(appUrl: string, token: string, email: string) {
  const url = new URL("/auth/sign-up", normalizeAppUrl(appUrl));
  url.searchParams.set("invitation", token);
  url.searchParams.set("email", email);
  return url.toString();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailContent({
  expiresAt,
  fullName,
  invitationUrl,
  roleKey,
}: {
  expiresAt: string;
  fullName: string;
  invitationUrl: string;
  roleKey: RoleKey;
}) {
  const roleLabel = demoRoleProfiles[roleKey].label;
  const greeting = fullName ? `Hola ${fullName},` : "Hola,";
  const htmlGreeting = escapeHtml(greeting);
  const htmlInvitationUrl = escapeHtml(invitationUrl);
  const htmlRoleLabel = escapeHtml(roleLabel);
  const htmlExpiresAt = escapeHtml(expiresAt);
  const subject = "Invitacion a Analiza BI";
  const text = [
    greeting,
    "",
    `Te invitaron a Analiza BI con el rol ${roleLabel}.`,
    "Abre el enlace para aceptar la invitacion y continuar con la configuracion de tu cuenta:",
    invitationUrl,
    "",
    `Esta invitacion vence el ${expiresAt}.`,
    "",
    "Si no esperabas este correo, puedes ignorarlo.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
      <h2 style="margin:0 0 16px">Invitacion a Analiza BI</h2>
      <p>${htmlGreeting}</p>
      <p>Te invitaron a Analiza BI con el rol <strong>${htmlRoleLabel}</strong>.</p>
      <p>
        <a href="${htmlInvitationUrl}" style="display:inline-block;background:#4338ca;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">
          Aceptar invitacion
        </a>
      </p>
      <p style="color:#4b5563">Esta invitacion vence el ${htmlExpiresAt}.</p>
      <p style="color:#6b7280;font-size:13px">Si no esperabas este correo, puedes ignorarlo.</p>
    </div>
  `;

  return { html, subject, text };
}

export async function createUserInvitation({
  appUrl,
  actorUserId,
  email,
  fullName,
  roleKey,
  scope,
}: CreateInvitationInput): Promise<CreatedInvitation> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  const token = randomBytes(32).toString("base64url");
  const invitationTokenHash = createHash("sha256").update(token).digest("hex");
  const organizationId = requiredUuid(scope.organizationId, "organizationId");
  const auditableActorUserId = nullableUuid(actorUserId);

  try {
    await client.query("begin");

    const roleResult = await client.query<RoleRow>(
      "select id from public.roles where key = $1 limit 1",
      [roleKey],
    );
    const roleId = roleResult.rows[0]?.id;

    if (!roleId) {
      throw new Error("Role not found for invitation.");
    }

    const invitationResult = await client.query<InvitationRow>(
      `
        insert into public.user_invitations (
          organization_id,
          email,
          invited_role_id,
          country_id,
          company_id,
          operational_area_id,
          branch_id,
          invited_by,
          invitation_token_hash,
          metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
        returning id, expires_at
      `,
      [
        organizationId,
        email,
        roleId,
        nullableUuid(scope.countryId),
        nullableUuid(scope.companyId),
        nullableUuid(scope.operationalAreaId),
        nullableUuid(scope.branchId),
        auditableActorUserId,
        invitationTokenHash,
        JSON.stringify({
          delivery_provider: "smtp",
          invited_name: fullName,
          source: "usuarios-permisos",
        }),
      ],
    );
    const invitation = invitationResult.rows[0];

    if (!invitation) {
      throw new Error("Invitation could not be created.");
    }

    await client.query(
      `
        insert into public.audit_logs (
          organization_id,
          action,
          entity_table,
          entity_id,
          country_id,
          company_id,
          branch_id,
          actor_user_id,
          metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        organizationId,
        "user_invitation.created",
        "user_invitations",
        invitation.id,
        nullableUuid(scope.countryId),
        nullableUuid(scope.companyId),
        nullableUuid(scope.branchId),
        auditableActorUserId,
        JSON.stringify({
          invited_email_domain: email.split("@")[1] ?? "unknown",
          invited_role: roleKey,
          source: "usuarios-permisos",
        }),
      ],
    );

    if (assignmentTrackedRoles.includes(roleKey)) {
      await client.query(
        `
          insert into public.assignment_history (
            organization_id,
            actor_user_id,
            entity_table,
            entity_id,
            action,
            previous_scope,
            next_scope,
            reason
          )
          values ($1, $2, 'user_invitations', $3, 'manager_assignment.invited', '{}'::jsonb, $4::jsonb, $5)
        `,
        [
          organizationId,
          auditableActorUserId,
          invitation.id,
          JSON.stringify({
            branch_id: nullableUuid(scope.branchId),
            company_id: nullableUuid(scope.companyId),
            country_id: nullableUuid(scope.countryId),
            invited_email_domain: email.split("@")[1] ?? "unknown",
            invited_role: roleKey,
            operational_area_id: nullableUuid(scope.operationalAreaId),
            status: "pending_invitation",
          }),
          "Invitacion para nombramiento de gerente con alcance operativo controlado.",
        ],
      );
    }

    await client.query("commit");

    const expiresAt = new Intl.DateTimeFormat("es-SV", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/El_Salvador",
    }).format(new Date(invitation.expires_at));
    const invitationUrl = buildInvitationUrl(appUrl, token, email);
    const emailContent = buildEmailContent({
      expiresAt,
      fullName,
      invitationUrl,
      roleKey,
    });

    return {
      emailHtml: emailContent.html,
      emailText: emailContent.text,
      expiresAt,
      id: invitation.id,
      recipientEmail: email,
      subject: emailContent.subject,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
