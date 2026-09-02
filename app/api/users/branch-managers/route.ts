import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import {
  getMissingDatabaseConfig,
  getPostgresPool,
  resetPostgresRuntimeRole,
} from "@/lib/server/database";
import { isManagementLevel } from "@/lib/tenant/manager-incentives";
import { isSuperAdministrator } from "@/lib/tenant/delegation-policy";
import type { RoleKey } from "@/lib/tenant/demo-context";

type BranchManagerRow = {
  assignment_id: string;
  area_id: string | null;
  area_name: string | null;
  base_bonus_amount: number | string | null;
  branch_id: string | null;
  branch_name: string | null;
  company_id: string | null;
  company_name: string | null;
  country_id: string | null;
  country_name: string | null;
  display_name: string | null;
  email: string | null;
  management_level: string | null;
  profile_id: string;
};

const listAllowedRoles = new Set<RoleKey>([
  "super_admin",
  "webmaster_admin",
  "gerente_operaciones",
  "gerente_area",
]);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function nullableUuid(value: string | null | undefined) {
  return value && uuidPattern.test(value) ? value : null;
}

function readNumberLike(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return null;
}

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

export async function GET() {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Debes iniciar sesion para consultar gerentes.", 401);
  }

  if (!listAllowedRoles.has(actor.roleKey)) {
    return NextResponse.json({ branchManagers: [], ok: true });
  }

  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    return jsonError(
      "Faltan variables privadas para consultar gerentes de sucursal.",
      503,
      missingConfig,
    );
  }

  const organizationId = nullableUuid(actor.scope.organizationId);

  if (!organizationId) {
    return jsonError("El alcance de organizacion no esta completo.", 403);
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await resetPostgresRuntimeRole(client);

    const result = await client.query<BranchManagerRow>(
      `
        select
          ma.id as assignment_id,
          p.id as profile_id,
          p.display_name,
          p.email,
          ma.management_level,
          ma.base_bonus_amount,
          ma.country_id,
          c.name as country_name,
          ma.company_id,
          co.name as company_name,
          ma.operational_area_id as area_id,
          oa.name as area_name,
          ma.branch_id,
          b.name as branch_name
        from public.manager_assignments ma
        join public.roles r on r.id = ma.role_id
        join public.profiles p on p.id = ma.profile_id
        left join public.countries c on c.id = ma.country_id
        left join public.companies co on co.id = ma.company_id
        left join public.operational_areas oa on oa.id = ma.operational_area_id
        left join public.branches b on b.id = ma.branch_id
        where r.key = 'gerente_sucursal'
          and ma.organization_id = $1
          and ma.status = 'active'
          and ma.deactivated_at is null
          and ma.branch_id is not null
          and p.status = 'active'
          and p.deactivated_at is null
          and p.deleted_at is null
          and (
            $2::uuid is null
            or ma.country_id = $2::uuid
            or $6 = true
          )
          and (
            $3::uuid is null
            or ma.company_id = $3::uuid
            or $6 = true
          )
          and (
            $4::uuid is null
            or ma.operational_area_id = $4::uuid
            or $6 = true
          )
          and (
            $5::uuid is null
            or ma.branch_id = $5::uuid
            or $6 = true
          )
        order by p.display_name, b.name, ma.created_at desc
      `,
      [
        organizationId,
        nullableUuid(actor.scope.countryId),
        nullableUuid(actor.scope.companyId),
        nullableUuid(actor.scope.operationalAreaId),
        nullableUuid(actor.scope.branchId),
        isSuperAdministrator(actor.roleKey),
      ],
    );

    return NextResponse.json({
      branchManagers: result.rows.map((row) => ({
        assignmentId: row.assignment_id,
        areaId: row.area_id,
        areaName: row.area_name,
        baseBonusAmount: readNumberLike(row.base_bonus_amount),
        branchId: row.branch_id,
        branchName: row.branch_name,
        businessId: row.company_id,
        businessName: row.company_name,
        countryId: row.country_id,
        countryName: row.country_name,
        email: row.email,
        fullName: row.display_name ?? row.email ?? "Gerente de sucursal",
        id: row.profile_id,
        managementLevel: isManagementLevel(row.management_level)
          ? row.management_level
          : null,
      })),
      ok: true,
    });
  } finally {
    await resetPostgresRuntimeRole(client).catch(() => undefined);
    client.release();
  }
}
