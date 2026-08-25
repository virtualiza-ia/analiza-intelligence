import { NextResponse } from "next/server";

import { demoOrganizationId } from "@/lib/auth/demo-admin";
import {
  BranchGovernanceError,
  createGovernedBranch,
} from "@/lib/server/branch-governance";
import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getMissingDatabaseConfig } from "@/lib/server/database";
import { canPerformAction } from "@/lib/security/authorization-policy";
import type { ScopeBoundary } from "@/lib/tenant/delegation-policy";

type CreateBranchRequest = {
  city?: unknown;
  code?: unknown;
  name?: unknown;
  reason?: unknown;
  scope?: unknown;
};

const branchCodePattern = /^[A-Z0-9][A-Z0-9-_]{1,30}$/;

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
    branchId: null,
    companyId:
      typeof scope.companyId === "string" ? scope.companyId : undefined,
    countryId:
      typeof scope.countryId === "string" ? scope.countryId : undefined,
    operationalAreaId:
      typeof scope.operationalAreaId === "string"
        ? scope.operationalAreaId
        : undefined,
    organizationId,
  };
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

export async function POST(request: Request) {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para crear sucursales.", 401);
  }

  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    return jsonError(
      "Faltan variables privadas para crear sucursales reales.",
      503,
      missingConfig,
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | CreateBranchRequest
    | null;
  const name =
    typeof payload?.name === "string" ? payload.name.trim() : "";
  const code =
    typeof payload?.code === "string" ? normalizeCode(payload.code) : "";
  const city =
    typeof payload?.city === "string" ? payload.city.trim() : "";
  const reason =
    typeof payload?.reason === "string" ? payload.reason.trim() : "";
  const targetScope = readScope(payload?.scope);

  if (name.length < 3) {
    return jsonError("Escribe el nombre completo de la sucursal.", 400);
  }

  if (!branchCodePattern.test(code)) {
    return jsonError(
      "El codigo debe tener 2 a 31 caracteres, usando letras, numeros, guion o guion bajo.",
      400,
    );
  }

  if (!targetScope || !targetScope.countryId || !targetScope.companyId) {
    return jsonError(
      "Selecciona pais y linea de negocio para crear la sucursal.",
      400,
    );
  }

  if (reason.length < 10) {
    return jsonError("Agrega una razon de alta para el historial.", 400);
  }

  if (!canPerformAction(actor, "branches.create", { scope: targetScope })) {
    return jsonError(
      "Tu rol no puede crear sucursales fuera de su alcance autorizado.",
      403,
    );
  }

  try {
    const branch = await createGovernedBranch({
      actor,
      city,
      code,
      name,
      reason,
      scope: targetScope,
    });

    return NextResponse.json({ branch, ok: true, status: "created" });
  } catch (error) {
    if (error instanceof BranchGovernanceError) {
      return jsonError(error.message, 400);
    }

    console.error("Failed to create governed branch", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonError(
      "No se pudo crear la sucursal. Revisa base de datos y logs del servidor.",
      502,
    );
  }
}
