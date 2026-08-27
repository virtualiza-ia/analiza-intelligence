import { NextResponse } from "next/server";

import { demoOrganizationId } from "@/lib/auth/demo-admin";
import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import { getMissingSmtpConfig, sendMail } from "@/lib/server/mail";
import {
  createUserInvitation,
  UserInvitationError,
} from "@/lib/server/user-invitations";
import {
  createLocalUserWithTemporaryPassword,
  LocalAuthRequestError,
} from "@/lib/server/local-auth";
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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type InviteUserRequest = {
  email?: unknown;
  fullName?: unknown;
  managerIncentive?: unknown;
  managedBranchManagerIds?: unknown;
  temporaryPassword?: unknown;
  roleKey?: unknown;
  scope?: unknown;
};

function isRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && roleKeys.includes(value as RoleKey);
}

function isUuid(value: string) {
  return uuidPattern.test(value);
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

function readManagedBranchManagerIds(
  value: unknown,
  roleKey: RoleKey,
): { error: string | null; ids: string[] } {
  if (roleKey !== "gerente_area" || value === undefined) {
    return { error: null, ids: [] };
  }

  if (!Array.isArray(value)) {
    return {
      error: "Selecciona gerentes de sucursal validos para esta gerencia de area.",
      ids: [],
    };
  }

  if (value.length > 50) {
    return {
      error: "Puedes asignar hasta 50 gerentes de sucursal por invitacion.",
      ids: [],
    };
  }

  const ids = value.filter(
    (id): id is string => typeof id === "string" && isUuid(id),
  );

  if (ids.length !== value.length) {
    return {
      error: "Selecciona gerentes de sucursal validos para esta gerencia de area.",
      ids: [],
    };
  }

  return { error: null, ids: [...new Set(ids)] };
}

export async function POST(request: Request) {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para invitar usuarios.", 401);
  }

  const payload = (await request.json().catch(() => null)) as
    | InviteUserRequest
    | null;
  const temporaryPassword =
    typeof payload?.temporaryPassword === "string"
      ? payload.temporaryPassword
      : "";
  const databaseMissingConfig = getMissingDatabaseConfig();
  const smtpMissingConfig = temporaryPassword ? [] : getMissingSmtpConfig();
  const missingConfig = [...databaseMissingConfig, ...smtpMissingConfig];

  if (missingConfig.length > 0) {
    return jsonError(
      temporaryPassword
        ? "Faltan variables privadas para crear usuarios."
        : "Faltan variables privadas para enviar invitaciones reales.",
      503,
      missingConfig,
    );
  }

  const appUrl = temporaryPassword ? "" : getRequestOrigin(request);

  if (!temporaryPassword && !appUrl) {
    return jsonError(
      "Falta configurar APP_URL para enviar invitaciones en produccion.",
      503,
      ["APP_URL"],
    );
  }
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

  const managedBranchManagerResult = readManagedBranchManagerIds(
    payload.managedBranchManagerIds,
    payload.roleKey,
  );

  if (managedBranchManagerResult.error) {
    return jsonError(managedBranchManagerResult.error, 400);
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
    if (temporaryPassword) {
      const user = await createLocalUserWithTemporaryPassword({
        actorUserId: actor.userId,
        email,
        fullName,
        managedBranchManagerIds: managedBranchManagerResult.ids,
        managerIncentive: managerIncentiveResult.incentive ?? undefined,
        password: temporaryPassword,
        roleKey: payload.roleKey,
        scope: targetScope,
      });

      return NextResponse.json({
        ok: true,
        status: "created",
        user,
      });
    }

    const invitation = await createUserInvitation({
      appUrl: appUrl ?? "",
      email,
      fullName,
      managedBranchManagerIds: managedBranchManagerResult.ids,
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
      managedBranchManagers: invitation.managedBranchManagers,
      ok: true,
      status: "sent",
    });
  } catch (error) {
    if (error instanceof LocalAuthRequestError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof UserInvitationError) {
      return jsonError(error.message, error.status);
    }

    console.error("Failed to send user invitation", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonError(
      "No se pudo enviar la invitacion. Revisa SMTP, base de datos y logs del servidor.",
      502,
    );
  }
}
