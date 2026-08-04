import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import {
  branchLifecycleStatuses,
  buildSoftDeactivationPlan,
  canAccessRecord,
  canActivateBranch,
  canCreateBranch,
  canCreateRole,
  canInviteUser,
  getInitialBranchStatus,
  getRoleHierarchyLevel,
  roleHierarchy,
} from "../lib/tenant/delegation-policy.ts";

const migrationPath =
  "supabase/migrations/20260729000200_delegated_user_hierarchy.sql";
const seedPath = "supabase/seed.sql";
const contextDataPath = "lib/tenant/demo-context.ts";
const usersComponentPath = "components/business-module-dashboard.tsx";

for (const file of [
  migrationPath,
  seedPath,
  contextDataPath,
  usersComponentPath,
]) {
  statSync(file);
}

const migration = readFileSync(migrationPath, "utf8");
const seed = readFileSync(seedPath, "utf8");
const contextData = readFileSync(contextDataPath, "utf8");
const usersComponent = readFileSync(usersComponentPath, "utf8");

const organizationId = "org-demo";
const countryId = "sv";
const companyId = "lab";
const operationalAreaId = "area-centro";
const branchId = "branch-aguilares";

const operationsActor = {
  roleKey: "gerente_operaciones",
  scope: {
    organizationId,
    countryId,
    companyId,
  },
  userId: "ops-user",
};

const areaActor = {
  roleKey: "gerente_area",
  scope: {
    organizationId,
    countryId,
    companyId,
    operationalAreaId,
  },
  userId: "area-user",
};

const branchActor = {
  canInviteOperationalUsers: true,
  roleKey: "gerente_sucursal",
  scope: {
    organizationId,
    countryId,
    companyId,
    operationalAreaId,
    branchId,
  },
  userId: "branch-user",
};

const areaTarget = {
  roleKey: "gerente_area",
  scope: {
    organizationId,
    countryId,
    companyId,
    operationalAreaId,
  },
};

const branchManagerTarget = {
  roleKey: "gerente_sucursal",
  scope: {
    organizationId,
    countryId,
    companyId,
    operationalAreaId,
    branchId,
  },
};

const operationalUserTarget = {
  roleKey: "usuario_operativo",
  scope: {
    organizationId,
    countryId,
    companyId,
    operationalAreaId,
    branchId,
  },
};

assert.equal(
  canInviteUser(operationsActor, areaTarget),
  true,
  "Operations manager should create area managers in scope.",
);

assert.equal(
  canCreateBranch(operationsActor, areaTarget.scope),
  true,
  "Operations manager should create branches in scope.",
);

assert.equal(
  canInviteUser(areaActor, branchManagerTarget),
  true,
  "Area manager should create branch managers in assigned area.",
);

assert.equal(
  canCreateBranch(areaActor, branchManagerTarget.scope),
  false,
  "Area manager must not create branches.",
);

assert.equal(
  canInviteUser(branchActor, branchManagerTarget),
  false,
  "Branch manager must not create branch managers.",
);

assert.equal(
  canInviteUser(branchActor, operationalUserTarget),
  true,
  "Branch manager may create operational users when explicitly delegated.",
);

for (const actorRole of roleHierarchy.map((entry) => entry.roleKey)) {
  for (const targetRole of roleHierarchy.map((entry) => entry.roleKey)) {
    if (getRoleHierarchyLevel(targetRole) >= getRoleHierarchyLevel(actorRole)) {
      assert.equal(
        canCreateRole(actorRole, targetRole, {
          canInviteOperationalUsers: true,
        }),
        false,
        `${actorRole} must not create equal or higher role ${targetRole}.`,
      );
    }
  }
}

assert.equal(
  canAccessRecord(areaActor, {
    organizationId,
    countryId,
    companyId,
    operationalAreaId: "area-oriente",
    branchId: "branch-other",
  }),
  false,
  "Managers must not access records outside their operational area.",
);

const deactivationPlan = buildSoftDeactivationPlan({
  actor: areaActor,
  subordinateCount: 0,
  target: branchManagerTarget,
  targetBranchCount: 1,
});

assert.equal(deactivationPlan.canDeactivate, true);
assert.equal(deactivationPlan.requiresReassignment, true);
assert.equal(deactivationPlan.auditAction, "manager.soft_deactivate");

assert.equal(getInitialBranchStatus(), "pending_manager");
assert.equal(canActivateBranch({ configurationComplete: true, managerAssigned: true }), true);
assert.equal(canActivateBranch({ configurationComplete: true, managerAssigned: false }), false);
assert.deepEqual(branchLifecycleStatuses, [
  "draft",
  "pending_manager",
  "active",
  "temporarily_closed",
  "inactive",
]);

for (const table of [
  "operational_areas",
  "area_branch_assignments",
  "manager_assignments",
  "reporting_lines",
  "user_invitations",
  "role_hierarchy",
  "permission_delegations",
  "assignment_history",
]) {
  if (!migration.includes(`create table if not exists public.${table}`)) {
    throw new Error(`Missing delegated hierarchy table: ${table}`);
  }

  if (!migration.includes(`alter table public.${table} enable row level security`)) {
    throw new Error(`Missing delegated hierarchy RLS: ${table}`);
  }
}

for (const requiredSqlText of [
  "organization_id",
  "country_id",
  "company_id",
  "operational_area_id",
  "branch_id",
  "role_id",
  "current_user_can_delegate_role",
  "current_user_can_access_operational_area",
  "current_user_can_manage_delegated_scope",
  "invitation_token_hash",
  "pending_invitation",
  "alter column status set default 'pending_manager'",
  "deleted_at",
  "audit_logs",
  "assignment_history",
]) {
  if (!migration.includes(requiredSqlText)) {
    throw new Error(`Delegated hierarchy migration is missing: ${requiredSqlText}`);
  }
}

for (const hierarchyText of [
  "('super_admin', 100, true)",
  "('gerente_operaciones', 80, true)",
  "('gerente_area', 60, true)",
  "('gerente_sucursal', 40, true)",
  "('usuario_operativo', 20, false)",
  "('viewer', 10, false)",
]) {
  if (!migration.includes(hierarchyText) || !seed.includes(hierarchyText)) {
    throw new Error(`Missing hierarchy seed or migration row: ${hierarchyText}`);
  }
}

for (const requiredContextText of [
  "demoOperationalAreas",
  "operationalAreaId",
  "areaManagerName",
  "sourceTrace: branch.sourceTrace",
]) {
  if (!contextData.includes(requiredContextText)) {
    throw new Error(`Context hierarchy data is missing: ${requiredContextText}`);
  }
}

for (const requiredUserUiText of [
  "Invitar usuario DEMO",
  "Selecciona la gerencia de area",
  "Selecciona la sucursal",
  "Pendiente invitacion",
  "Reasignacion requerida",
  "Desactivar",
]) {
  if (!usersComponent.includes(requiredUserUiText)) {
    throw new Error(`Delegated user UI is missing: ${requiredUserUiText}`);
  }
}

console.log("Delegation policy checks passed.");
