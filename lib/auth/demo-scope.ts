import {
  demoBranches,
  demoOperationalAreas,
  type RoleKey,
} from "../tenant/demo-context.ts";
import type { ScopeBoundary } from "../tenant/delegation-policy.ts";

const demoOrganizationId = "10000000-0000-4000-8000-000000000001";
const fallbackCountryId = "30000000-0000-4000-8000-000000000003";
const fallbackCompanyId = "40000000-0000-4000-8000-000000000002";

function getScopedDemoBranch() {
  return (
    demoBranches.find((branch) => branch.operationalAreaId && branch.isActive !== false) ??
    demoBranches.find((branch) => branch.isActive !== false) ??
    demoBranches[0] ??
    null
  );
}

function getScopedDemoArea(branch: ReturnType<typeof getScopedDemoBranch>) {
  return (
    demoOperationalAreas.find((area) => area.id === branch?.operationalAreaId) ??
    demoOperationalAreas[0] ??
    null
  );
}

export function getDemoScopeForRole(roleKey: RoleKey): ScopeBoundary {
  const branch = getScopedDemoBranch();
  const area = getScopedDemoArea(branch);
  const countryId = branch?.countryId ?? area?.countryId ?? fallbackCountryId;
  const companyId = branch?.companyId ?? area?.companyId ?? fallbackCompanyId;
  const operationalAreaId = branch?.operationalAreaId ?? area?.id ?? null;
  const baseScope = {
    organizationId: demoOrganizationId,
  };

  if (roleKey === "gerente_sucursal" || roleKey === "usuario_operativo") {
    return {
      ...baseScope,
      branchId: branch?.id ?? null,
      companyId,
      countryId,
      operationalAreaId,
    };
  }

  if (roleKey === "gerente_area") {
    return {
      ...baseScope,
      companyId,
      countryId,
      operationalAreaId,
    };
  }

  if (roleKey === "gerente_operaciones" || roleKey === "viewer") {
    return {
      ...baseScope,
      companyId,
      countryId,
    };
  }

  return baseScope;
}
