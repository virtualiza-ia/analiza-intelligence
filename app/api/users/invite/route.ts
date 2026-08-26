import { NextResponse } from "next/server";

import { demoOrganizationId } from "@/lib/auth/demo-admin";
import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import { getMissingSmtpConfig, sendMail } from "@/lib/server/mail";
import { createUserInvitation } from "@/lib/server/user-invitations";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";
import type { ScopeBoundary } from "@/lib/tenant/delegation-policy";
import { canPerformAction } from "@/lib/security/authorization-policy";
import { isProductionRuntimeEnvironment } from "@/lib/security/environment";
import {
  isManagementLevel,
  isManagerIncentiveRole,
  normalizeBaseBonusAmount,
  type ManagerIncentiveInput,
} from "@/lib/tenant/manager-incentives";

type InviteUserRequest = {
  email?: unknown;
  fullName?: unknown;
  managerIncentive?: unknown;
  roleKey?: unknown;
  scope?: unknown;
};

function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && roleKeys.includes(value as RoleKey);
}

function readScope(value: unknown): ScopeBoundary | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const scope = value as Record<string, unknown>;
  const organizationId =
    scope.organizationId === "Grupo Analiza DEMO"
      ? demoOrganizationId
      : scope.organizationId;

  if (typeof organizationId !== "string" || !organizationId) {
    return null;
  }

  return {
    organizationId,
    branchId:
      typeof scope.branchId === "string" ? scope.branchId : undefined,
    companyId:
      typeof scope.companyId === "string" ? scope.companyId : undefined,
    countryId:
      typeof scope.countryId === "string" ? scope.countryId : undefined,
    operationalAreaId:
      typeof scope.operationalAreaId === "string"
        ? scope.operationalAreaId
        : undefined,
  };
}

function getRequestOrigin(request: Request) {
  const configuredOrigin =
    process.env.APP_URL?.trim() ||
    (!isProductionRuntimeEnvironment()
      ? process.env.NEXT_PUBLIC_APP_URL?.trim()
      : "");

  if (configuredOrigin) {
    return configuredOrigin;
  }

  return isProductionRuntimeEnvironment() ? null : new URL(request.url).origin;
}

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

function getMissingScopeError(roleKey: RoleKey, scope: ScopeBoundary) {
  if (roleKey === "gerente_area" && !scope.operationalAreaId) {
    return "Selecciona la gerencia de area para invitar este gerente.";
  }

  if (roleKey === "gerente_sucursal") {
    if (!scope.operationalAreaId) {
      return "Selecciona la gerencia de area para invitar este gerente.";
    }

    if (!scope.branchId) {
      return "Selecciona la sucursal para invitar este gerente.";
    }
  }

  if (roleKey === "usuario_operativo" && !scope.branchId) {
    return "Selecciona la sucursal para invitar este usuario.";
  }

  return null;
}

function readManagerIncentive(
  value: unknown,
  roleKey: RoleKey,
): { error: string | null; incentive: ManagerIncentiveInput | null } {
  if (!isManagerIncentiveRole(roleKey)) {
    return { error: null, incentive: null };
  }

  if (typeof value !== "object" || value === null) {
    return {
      error: "Define nivel de gerencia y bono base para este gerente.",
      incentive: null,
    };
  }

  const incentive = value as Record<string, unknown>;
  const rawBaseBonusAmount = incentive.baseBonusAmount;
  const baseBonusAmount =
    typeof rawBaseBonusAmount === "number"
      ? rawBaseBonusAmount
      : typeof rawBaseBonusAmount === "string"
        ? Number(rawBaseBonusAmount)
        : Number.NaN;
  const normalizedBaseBonusAmount =
    normalizeBaseBonusAmount(baseBonusAmount);

  if (!isManagementLevel(incentive.managementLevel)) {
    return {
      error: "Selecciona nivel de gerencia senior, middle o junior.",
      incentive: null,
    };
  }

  if (!normalizedBaseBonusAmount) {
    return {
      error: "Ingresa un bono base mayor a 0 y menor o igual a 10000.",
      incentive: null,
    };
  }

  return {
    error: null,
    incentive: {
      baseBonusAmount: normalizedBaseBonusAmount,
      managementLevel: incentive.managementLevel,
    },
  };
}

export async function POST(request: Request) {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para invitar usuarios.", 401);
  }

  const databaseMissingConfig = getMissingDatabaseConfig();
  const smtpMissingConfig = getMissingSmtpConfig();
  const missingConfig = [...databaseMissingConfig, ...smtpMissingConfig];

  if (missingConfig.length > 0) {
    return jsonError(
      "Faltan variables privadas para enviar invitaciones reales.",
      503,
      missingConfig,
    );
  }

  const appUrl = getRequestOrigin(request);

  if (!appUrl) {
    return jsonError(
      "Falta configurar APP_URL para enviar invitaciones en produccion.",
      503,
      ["APP_URL"],
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | InviteUserRequest
    | null;
  const email =
    typeof payload?.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";
  const fullName =
    typeof payload?.fullName === "string" ? payload.fullName.trim() : "";

  if (!fullName || !email) {
    return jsonError("Completa nombre y correo para enviar la invitacion.", 400);
  }

  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    return jsonError("El correo no tiene un formato valido.", 400);
  }

  if (!isRoleKey(payload?.roleKey)) {
    return jsonError("Selecciona un rol valido para la invitacion.", 400);
  }

  const targetScope = readScope(payload?.scope);

  if (!targetScope) {
    return jsonError("El alcance de la invitacion no esta completo.", 400);
  }

  const missingScopeError = getMissingScopeError(payload.roleKey, targetScope);

  if (missingScopeError) {
    return jsonError(missingScopeError, 400);
  }

  const managerIncentiveResult = readManagerIncentive(
    payload.managerIncentive,
    payload.roleKey,
  );

  if (managerIncentiveResult.error) {
    return jsonError(managerIncentiveResult.error, 400);
  }

  if (
    !canPerformAction(actor, "users.invite", {
      roleKey: payload.roleKey,
      scope: targetScope,
    })
  ) {
    return jsonError(
      "Tu rol solo puede invitar usuarios de nivel inferior y dentro de tu alcance.",
      403,
    );
  }

  try {
    const invitation = await createUserInvitation({
      appUrl,
      email,
      fullName,
      roleKey: payload.roleKey,
      scope: targetScope,
      actorUserId: actor.userId,
      managerIncentive: managerIncentiveResult.incentive ?? undefined,
    });

    await sendMail({
      html: invitation.emailHtml,
      subject: invitation.subject,
      text: invitation.emailText,
      to: invitation.recipientEmail,
    });

    return NextResponse.json({
      expiresAt: invitation.expiresAt,
      invitationId: invitation.id,
      ok: true,
      status: "sent",
    });
  } catch (error) {
    console.error("Failed to send user invitation", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonError(
      "No se pudo enviar la invitacion. Revisa SMTP, base de datos y logs del servidor.",
      502,
    );
  }
}
