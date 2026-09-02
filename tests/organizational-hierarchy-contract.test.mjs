import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

function read(path) {
  statSync(path);
  return readFileSync(path, "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countRecordLines(source, text) {
  return source.match(new RegExp(`^\\s*${escapeRegExp(text)},\\s*$`, "gm"))?.length ?? 0;
}

const branchManagersRoute = read("app/api/users/branch-managers/route.ts");
const localAuth = read("lib/server/local-auth.ts");
const component = read("components/business-module-dashboard.tsx");
const hierarchyMigration = read(
  "supabase/migrations/20260729000200_delegated_user_hierarchy.sql",
);
const scopedReportingMigration = read(
  "supabase/migrations/20260902000100_assignment_scoped_reporting_lines.sql",
);
const incentiveMigration = read(
  "supabase/migrations/20260826000100_manager_incentive_policy.sql",
);
const coreMigration = read("supabase/migrations/20260720000100_phase1_core.sql");
const managedBranches = read("lib/tenant/managed-branch-records.ts");
const contract = read("docs/organizational-hierarchy-contract.md");
const packageJson = read("package.json");

for (const requiredRouteText of [
  "ma.id as assignment_id",
  "assignmentId: row.assignment_id",
  "ma.country_id",
  "ma.company_id",
  "ma.operational_area_id as area_id",
  "ma.branch_id",
]) {
  assert.ok(
    branchManagersRoute.includes(requiredRouteText),
    `Branch manager assignment route is missing: ${requiredRouteText}`,
  );
}

assert.ok(
  !branchManagersRoute.includes("select distinct on (p.id)"),
  "Branch manager listing must not collapse multiple assignments for one profile.",
);

for (const requiredComponentText of [
  "assignmentId: string",
  "assignmentId: `demo-assignment-${branch.id}`",
  "key={manager.assignmentId}",
  "[...new Set(scopedBranchManagerOptions.map((manager) => manager.id))]",
  "[manager.businessName, manager.areaName]",
]) {
  assert.ok(
    component.includes(requiredComponentText),
    `User management UI must preserve assignment context: ${requiredComponentText}`,
  );
}

for (const requiredLocalAuthText of [
  "country_id is not distinct from $4::uuid",
  "company_id is not distinct from $5::uuid",
  "operational_area_id is not distinct from $6::uuid",
  "or branch_id = $7::uuid",
  "country_id,",
  "company_id,",
  "operational_area_id,",
  "branch_id,",
  "rl.branch_id is not distinct from $8::uuid",
]) {
  assert.ok(
    localAuth.includes(requiredLocalAuthText),
    `Reporting line activation must be scoped by assignment: ${requiredLocalAuthText}`,
  );
}

for (const requiredScopedReportingSql of [
  "add column if not exists country_id",
  "add column if not exists company_id",
  "add column if not exists operational_area_id",
  "add column if not exists branch_id",
  "reporting_lines_scope_idx",
  "ranked_reporting_lines",
  "reporting_lines_one_active_scope_idx",
  "Permite que una misma persona tenga relaciones distintas por asignacion",
  "Linea o compania",
]) {
  assert.ok(
    scopedReportingMigration.includes(requiredScopedReportingSql),
    `Scoped reporting-lines migration is missing: ${requiredScopedReportingSql}`,
  );
}

for (const requiredHierarchySql of [
  "create table if not exists public.manager_assignments",
  "profile_id uuid not null references public.profiles",
  "country_id uuid references public.countries",
  "company_id uuid references public.companies",
  "operational_area_id uuid references public.operational_areas",
  "branch_id uuid references public.branches",
]) {
  assert.ok(
    hierarchyMigration.includes(requiredHierarchySql),
    `Manager assignments must keep operational assignment scope: ${requiredHierarchySql}`,
  );
}

assert.ok(
  !hierarchyMigration.includes("unique (profile_id)") &&
    !hierarchyMigration.includes("unique (profile_id, role_id)") &&
    !hierarchyMigration.includes("primary key (profile_id"),
  "A manager profile must be able to have multiple active operational assignments.",
);

for (const requiredBonusSql of [
  "alter table if exists public.manager_assignments",
  "management_level",
  "base_bonus_amount",
  "manager_assignments_base_bonus_amount_check",
]) {
  assert.ok(
    incentiveMigration.includes(requiredBonusSql),
    `Manager bonus metadata must live on assignments: ${requiredBonusSql}`,
  );
}

for (const requiredCoreSql of [
  "create table public.profiles",
  "id uuid primary key references auth.users(id)",
  "email text",
  "unique (organization_id, country_id, company_id, code)",
]) {
  assert.ok(
    coreMigration.includes(requiredCoreSql),
    `Core hierarchy schema is missing: ${requiredCoreSql}`,
  );
}

assert.ok(
  !coreMigration.includes("email text primary key") &&
    !coreMigration.includes("primary key (email)"),
  "Email must remain contact/login data, not the organizational primary key.",
);

assert.equal(
  managedBranches.match(/^\s*id: "managed-/gm)?.length,
  95,
  "Managed demo branches must keep the 95 operational assignments from the reviewed hierarchy.",
);

for (const [needle, expectedCount] of [
  ['countryIso2: "SV"', 60],
  ['countryIso2: "HN"', 35],
  ['businessLineCode: "LABORATORY"', 76],
  ['businessLineCode: "IMAGING"', 12],
  ['businessLineCode: "PHYSIOTHERAPY"', 7],
  ['branchManagerName: "No hay"', 11],
]) {
  assert.equal(
    countRecordLines(managedBranches, needle),
    expectedCount,
    `Managed demo branch count mismatch for ${needle}.`,
  );
}

assert.ok(
  managedBranches.includes('branchName: "San miguel - La Unión - L038"'),
  "Managed demo branches must include the Laboratorio La Union assignment.",
);

assert.ok(
  !managedBranches.includes('branchName: "Contac Center Laboratorio"'),
  "Managed demo branches must not carry the removed Contact Center assignment.",
);

for (const requiredContractText of [
  "95 operational assignments",
  "Country, zone, business line and branch are scope attributes, not roles.",
  "A branch manager may own multiple active assignments.",
  "The same branch manager may report to different area managers",
  "Email is a login/contact field only.",
  "Management level and base bonus are assignment attributes",
  "Honduras assignments may exist without branch manager email, bonus or category metadata.",
]) {
  assert.ok(
    contract.includes(requiredContractText),
    `Hierarchy contract doc is missing: ${requiredContractText}`,
  );
}

assert.ok(
  packageJson.includes("tests/organizational-hierarchy-contract.test.mjs"),
  "Organizational hierarchy contract test must run in npm test.",
);

console.log("Organizational hierarchy contract checks passed.");
