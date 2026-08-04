import "server-only";

import type { QueryResultRow } from "pg";

import type { AuthenticatedUser } from "@/lib/auth/session";
import { queryDatabase } from "@/lib/db/pool";
import { getCreatableRoles } from "@/lib/tenant/delegation-policy";
import { canInviteUser } from "@/lib/tenant/delegation-policy";

type NamedRow = QueryResultRow & { id: string; key?: string; name: string };
type BranchRow = NamedRow & {
  company_id: string;
  country_id: string;
  operational_area_id: string | null;
};
type AreaRow = NamedRow & { company_id: string; country_id: string };
type InvitationListRow = QueryResultRow & {
  branch_id: string | null;
  company_id: string | null;
  country_id: string | null;
  delivery_status: "failed" | "pending" | "sent";
  email: string;
  expires_at: Date;
  full_name: string;
  id: string;
  operational_area_id: string | null;
  role_key: import("@/lib/tenant/demo-context").RoleKey;
  role_name: string;
  status: "accepted" | "expired" | "pending" | "revoked";
};

export async function getUserManagementData(user: AuthenticatedUser) {
  const creatableRoles = getCreatableRoles(user.roleKey, {
    canInviteOperationalUsers: user.canInviteOperationalUsers,
  });

  const [roles, countries, companies, areas, branches, invitations] = await Promise.all([
    queryDatabase<NamedRow>(
      `select id, key, name from public.roles where key = any($1::text[]) order by name`,
      [creatableRoles],
    ),
    queryDatabase<NamedRow>(
      `select id, name from public.countries where organization_id = $1 and is_enabled order by name`,
      [user.scope.organizationId],
    ),
    queryDatabase<NamedRow>(
      `select id, name from public.companies where organization_id = $1 and is_enabled order by name`,
      [user.scope.organizationId],
    ),
    queryDatabase<AreaRow>(
      `select id, name, country_id, company_id from public.operational_areas
       where organization_id = $1 and status = 'active' and deleted_at is null order by name`,
      [user.scope.organizationId],
    ),
    queryDatabase<BranchRow>(
      `select id, name, country_id, company_id, operational_area_id
       from public.branches where organization_id = $1 and deleted_at is null
         and status <> 'inactive' order by name`,
      [user.scope.organizationId],
    ),
    queryDatabase<InvitationListRow>(
      `select i.id, i.email, i.status, i.delivery_status, i.expires_at,
         i.country_id, i.company_id, i.operational_area_id, i.branch_id,
         i.metadata->>'invited_name' as full_name, r.name as role_name,
         r.key as role_key
       from public.user_invitations i
       join public.roles r on r.id = i.invited_role_id
       where i.organization_id = $1
       order by i.created_at desc limit 100`,
      [user.scope.organizationId],
    ),
  ]);

  const withinActorScope = <Row extends { id: string }>(
    rows: Row[],
    selectedId: string | undefined,
  ) => selectedId ? rows.filter((row) => row.id === selectedId) : rows;

  const scopedCountries = withinActorScope(countries.rows, user.scope.countryId);
  const scopedCompanies = withinActorScope(companies.rows, user.scope.companyId);
  const scopedAreas = withinActorScope(areas.rows, user.scope.operationalAreaId)
    .filter((area) => !user.scope.countryId || area.country_id === user.scope.countryId)
    .filter((area) => !user.scope.companyId || area.company_id === user.scope.companyId);
  const scopedBranches = withinActorScope(branches.rows, user.scope.branchId)
    .filter((branch) => !user.scope.countryId || branch.country_id === user.scope.countryId)
    .filter((branch) => !user.scope.companyId || branch.company_id === user.scope.companyId)
    .filter((branch) => !user.scope.operationalAreaId || branch.operational_area_id === user.scope.operationalAreaId);

  return {
    areas: scopedAreas.map((row) => ({ companyId: row.company_id, countryId: row.country_id, id: row.id, name: row.name })),
    branches: scopedBranches.map((row) => ({ companyId: row.company_id, countryId: row.country_id, id: row.id, name: row.name, operationalAreaId: row.operational_area_id })),
    companies: scopedCompanies.map((row) => ({ id: row.id, name: row.name })),
    countries: scopedCountries.map((row) => ({ id: row.id, name: row.name })),
    invitations: invitations.rows.filter((row) => canInviteUser({
      canInviteOperationalUsers: user.canInviteOperationalUsers,
      roleKey: user.roleKey,
      scope: user.scope,
      userId: user.userId,
    }, {
      roleKey: row.role_key,
      scope: {
        branchId: row.branch_id ?? undefined,
        companyId: row.company_id ?? undefined,
        countryId: row.country_id ?? undefined,
        operationalAreaId: row.operational_area_id ?? undefined,
        organizationId: user.scope.organizationId,
      },
    })).map((row) => ({
      deliveryStatus: row.delivery_status,
      email: row.email,
      expiresAt: row.expires_at.toISOString(),
      fullName: row.full_name,
      id: row.id,
      roleName: row.role_name,
      status: row.status,
    })),
    roles: creatableRoles.map((key) => ({
      key,
      name: roles.rows.find((row) => row.key === key)?.name ?? key.replaceAll("_", " "),
    })),
  };
}

export type UserManagementData = Awaited<ReturnType<typeof getUserManagementData>>;
