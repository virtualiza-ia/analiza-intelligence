import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

import {
  canAccessProtectedPath,
  canPerformAction,
} from "../lib/security/authorization-policy.ts";
import { getDemoScopeForRole } from "../lib/auth/demo-scope.ts";
import { canUseDemoFeatures } from "../lib/security/environment.ts";
import {
  assertSafePostgresRuntimeRole,
  getMissingDatabaseConfig,
} from "../lib/server/database.ts";

const organizationId = "10000000-0000-4000-8000-000000000001";
const countryId = "30000000-0000-4000-8000-000000000003";
const companyId = "40000000-0000-4000-8000-000000000002";
const areaId = "area-centro";
const otherAreaId = "area-oriente";
const branchId = "branch-001";
const otherBranchId = "branch-002";

function actor(roleKey, scope, overrides = {}) {
  return {
    allowDemoRoleSwitch: false,
    email: `${roleKey}@analiza.local`,
    roleKey,
    scope: {
      organizationId,
      ...scope,
    },
    source: "local",
    userId: `${roleKey}-user`,
    ...overrides,
  };
}

const viewer = actor("viewer", { countryId, companyId });
const ceo = actor("ceo", { countryId, companyId });
const branchManager = actor("gerente_sucursal", {
  branchId,
  companyId,
  countryId,
  operationalAreaId: areaId,
});
const areaManager = actor("gerente_area", {
  companyId,
  countryId,
  operationalAreaId: areaId,
});
const operationsManager = actor("gerente_operaciones", {
  companyId,
  countryId,
});
const demoBranchManager = actor(
  "gerente_sucursal",
  getDemoScopeForRole("gerente_sucursal"),
);
const demoAreaManager = actor("gerente_area", getDemoScopeForRole("gerente_area"));

const originalAppEnv = process.env.APP_ENV;
const originalAnalizaAppEnv = process.env.ANALIZA_APP_ENV;
const originalVercelEnv = process.env.VERCEL_ENV;
const originalNodeEnv = process.env.NODE_ENV;
const originalEnableDemoAdmin = process.env.ANALIZA_ENABLE_DEMO_ADMIN;
const originalDemoSessionToken = process.env.ANALIZA_DEMO_ADMIN_SESSION_TOKEN;
const originalDatabaseUrl = process.env.DATABASE_URL;

delete process.env.ANALIZA_APP_ENV;
process.env.APP_ENV = "demo";
delete process.env.VERCEL_ENV;
assert.equal(
  canUseDemoFeatures(),
  true,
  "Local APP_ENV=demo must enable local-only demo features.",
);

process.env.VERCEL_ENV = "preview";
assert.equal(
  canUseDemoFeatures(),
  false,
  "Staging/preview must not enable demo login even if APP_ENV=demo is set.",
);

process.env.VERCEL_ENV = "production";
assert.equal(
  canUseDemoFeatures(),
  false,
  "Production must never enable demo login.",
);

process.env.NODE_ENV = "production";
delete process.env.APP_ENV;
delete process.env.ANALIZA_APP_ENV;
delete process.env.VERCEL_ENV;
assert.equal(
  canUseDemoFeatures(),
  false,
  "Production NODE_ENV without explicit APP_ENV must fail closed instead of defaulting to demo.",
);

process.env.NODE_ENV = "development";
delete process.env.APP_ENV;
delete process.env.ANALIZA_APP_ENV;
delete process.env.VERCEL_ENV;
assert.equal(
  canUseDemoFeatures(),
  false,
  "Local development without explicit APP_ENV=demo must fail closed instead of defaulting to demo.",
);

process.env.NODE_ENV = originalNodeEnv ?? "test";
process.env.APP_ENV = "demo";
process.env.ANALIZA_ENABLE_DEMO_ADMIN = "true";
process.env.ANALIZA_DEMO_ADMIN_SESSION_TOKEN = "local-demo-session-token-32-chars-min";
const { isDemoAdminEnabled } = await import("../lib/auth/demo-admin.ts");
assert.equal(
  isDemoAdminEnabled(),
  true,
  "Local demo admin must require explicit enablement and a long server-side token.",
);

delete process.env.ANALIZA_DEMO_ADMIN_SESSION_TOKEN;
assert.equal(
  isDemoAdminEnabled(),
  false,
  "Local demo admin must stay disabled without a configured session token.",
);

process.env.NODE_ENV = "production";
process.env.APP_ENV = "production";
process.env.DATABASE_URL = "postgres://user:password@localhost:5432/analiza";
assert.deepEqual(
  getMissingDatabaseConfig(),
  [],
  "Database URL is sufficient for config; RLS must be verified against the actual PostgreSQL runtime role.",
);

assert.throws(
  () =>
    assertSafePostgresRuntimeRole({
      current_user: "analiza_staging_app",
      rolbypassrls: true,
      rolsuper: false,
    }),
  /bypass RLS/,
  "Runtime PostgreSQL role must be rejected when it can bypass RLS.",
);

assert.throws(
  () =>
    assertSafePostgresRuntimeRole({
      current_user: "postgres",
      rolbypassrls: false,
      rolsuper: true,
    }),
  /bypass RLS/,
  "Runtime PostgreSQL role must be rejected when it is superuser.",
);

assert.doesNotThrow(
  () =>
    assertSafePostgresRuntimeRole({
      current_user: "analiza_authenticated_runtime",
      rolbypassrls: false,
      rolsuper: false,
    }),
  "Runtime PostgreSQL role without superuser or bypassrls may proceed.",
);

if (originalAppEnv === undefined) {
  delete process.env.APP_ENV;
} else {
  process.env.APP_ENV = originalAppEnv;
}

if (originalAnalizaAppEnv === undefined) {
  delete process.env.ANALIZA_APP_ENV;
} else {
  process.env.ANALIZA_APP_ENV = originalAnalizaAppEnv;
}

if (originalVercelEnv === undefined) {
  delete process.env.VERCEL_ENV;
} else {
  process.env.VERCEL_ENV = originalVercelEnv;
}

if (originalNodeEnv === undefined) {
  delete process.env.NODE_ENV;
} else {
  process.env.NODE_ENV = originalNodeEnv;
}

if (originalEnableDemoAdmin === undefined) {
  delete process.env.ANALIZA_ENABLE_DEMO_ADMIN;
} else {
  process.env.ANALIZA_ENABLE_DEMO_ADMIN = originalEnableDemoAdmin;
}

if (originalDemoSessionToken === undefined) {
  delete process.env.ANALIZA_DEMO_ADMIN_SESSION_TOKEN;
} else {
  process.env.ANALIZA_DEMO_ADMIN_SESSION_TOKEN = originalDemoSessionToken;
}

if (originalDatabaseUrl === undefined) {
  delete process.env.DATABASE_URL;
} else {
  process.env.DATABASE_URL = originalDatabaseUrl;
}

for (const deniedPath of [
  "/protected/importaciones",
  "/protected/usuarios-permisos",
  "/protected/auditoria",
  "/protected/capacidad",
  "/protected/gerentes",
]) {
  assert.equal(
    canAccessProtectedPath(viewer, deniedPath),
    false,
    `Viewer must not access ${deniedPath} by direct URL.`,
  );
}

for (const allowedPath of [
  "/protected",
  "/protected/context",
  "/protected/overview",
  "/protected/insights",
  "/protected/configuracion",
]) {
  assert.equal(
    canAccessProtectedPath(viewer, allowedPath),
    true,
    `Viewer should access explicitly authorized path ${allowedPath}.`,
  );
}

for (const executiveLinePath of [
  "/protected/fisioterapia",
  "/protected/laboratorio",
  "/protected/imagenes",
  "/protected/gerentes",
]) {
  assert.equal(
    canAccessProtectedPath(ceo, executiveLinePath),
    true,
    `CEO must have read-only access to ${executiveLinePath}.`,
  );
  assert.equal(
    canAccessProtectedPath(viewer, executiveLinePath),
    false,
    `Viewer must keep current restrictions for ${executiveLinePath}.`,
  );
}

for (const sensitiveCeoPath of [
  "/protected/cierres/nuevo",
  "/protected/importaciones",
  "/protected/auditoria",
  "/protected/conectores",
  "/protected/apis",
  "/protected/calidad-datos",
]) {
  assert.equal(
    canAccessProtectedPath(ceo, sensitiveCeoPath),
    false,
    `CEO direct line read access must not grant sensitive route ${sensitiveCeoPath}.`,
  );
}

for (const duplicateExecutiveReportPath of [
  "/protected/finanzas",
  "/protected/metas",
  "/protected/insights",
]) {
  assert.equal(
    canAccessProtectedPath(ceo, duplicateExecutiveReportPath),
    false,
    `CEO must use /protected/overview instead of duplicate report route ${duplicateExecutiveReportPath}.`,
  );
}

for (const operationsAllowedPath of [
  "/protected/importaciones",
  "/protected/cierres/nuevo",
  "/protected/operacion",
  "/protected/capacidad",
  "/protected/calidad-datos",
  "/protected/usuarios-permisos",
]) {
  assert.equal(
    canAccessProtectedPath(operationsManager, operationsAllowedPath),
    true,
    `Operations manager must access ${operationsAllowedPath}.`,
  );
}

for (const duplicateOperationsPath of [
  "/protected/metas",
  "/protected/insights",
  "/protected/plantillas",
  "/protected/conectores",
  "/protected/apis",
]) {
  assert.equal(
    canAccessProtectedPath(operationsManager, duplicateOperationsPath),
    false,
    `Operations manager must use the unified operational flow instead of ${duplicateOperationsPath}.`,
  );
}

assert.equal(
  canAccessProtectedPath(ceo, "/protected/usuarios-permisos"),
  true,
  "CEO must access governed branch and user creation.",
);

for (const branchManagerAllowedPath of [
  "/protected/mi-sucursal",
  "/protected/importaciones",
  "/protected/cierres",
  "/protected/resultados",
  "/protected/configuracion",
]) {
  assert.equal(
    canAccessProtectedPath(branchManager, branchManagerAllowedPath),
    true,
    `Branch manager must access ${branchManagerAllowedPath}.`,
  );
}

for (const duplicateBranchManagerPath of [
  "/protected/gerentes",
  "/protected/metas",
  "/protected/insights",
]) {
  assert.equal(
    canAccessProtectedPath(branchManager, duplicateBranchManagerPath),
    false,
    `Branch manager must use /protected/mi-sucursal instead of ${duplicateBranchManagerPath}.`,
  );
}

for (const sensitiveAction of [
  "imports.upload",
  "imports.publish",
  "imports.rollback",
  "connectors.manage",
  "connectors.run",
]) {
  assert.equal(
    canPerformAction(ceo, sensitiveAction, {
      roleKey: "gerente_area",
      scope: {
        branchId,
        companyId,
        countryId,
        operationalAreaId: areaId,
        organizationId,
      },
    }),
    false,
    `CEO read-only line access must not grant ${sensitiveAction}.`,
  );
}

for (const userDelegationAction of [
  "users.invite",
  "users.change_role",
  "users.change_scope",
  "users.activate",
  "users.deactivate",
]) {
  assert.equal(
    canPerformAction(ceo, userDelegationAction, {
      roleKey: "gerente_area",
      scope: {
        companyId,
        countryId,
        operationalAreaId: areaId,
        organizationId,
      },
    }),
    true,
    `CEO must be able to delegate lower user roles with ${userDelegationAction}.`,
  );
  assert.equal(
    canPerformAction(ceo, userDelegationAction, {
      roleKey: "ceo",
      scope: {
        companyId,
        countryId,
        organizationId,
      },
    }),
    false,
    `CEO must not delegate equal or higher roles with ${userDelegationAction}.`,
  );
}

assert.equal(
  canPerformAction(branchManager, "record.read", {
    scope: {
      branchId,
      companyId,
      countryId,
      operationalAreaId: areaId,
      organizationId,
    },
  }),
  true,
  "Branch manager must access its own branch.",
);

assert.equal(
  canPerformAction(branchManager, "record.read", {
    scope: {
      branchId: otherBranchId,
      companyId,
      countryId,
      operationalAreaId: areaId,
      organizationId,
    },
  }),
  false,
  "Branch manager must not access another branch.",
);

assert.equal(
  canPerformAction(branchManager, "users.invite", {
    roleKey: "gerente_sucursal",
    scope: {
      branchId,
      companyId,
      countryId,
      operationalAreaId: areaId,
      organizationId,
    },
  }),
  false,
  "Branch manager must not create managers.",
);

assert.equal(
  canPerformAction(areaManager, "record.read", {
    scope: {
      branchId,
      companyId,
      countryId,
      operationalAreaId: areaId,
      organizationId,
    },
  }),
  true,
  "Area manager must access records in its area.",
);

assert.equal(
  canPerformAction(areaManager, "record.read", {
    scope: {
      branchId: otherBranchId,
      companyId,
      countryId,
      operationalAreaId: otherAreaId,
      organizationId,
    },
  }),
  false,
  "Area manager must not access another area.",
);

assert.equal(
  canPerformAction(areaManager, "users.invite", {
    roleKey: "gerente_sucursal",
    scope: {
      branchId,
      companyId,
      countryId,
      operationalAreaId: areaId,
      organizationId,
    },
  }),
  true,
  "Area manager must create branch managers in its assigned area.",
);

assert.equal(
  canPerformAction(areaManager, "branches.create", {
    scope: {
      companyId,
      countryId,
      operationalAreaId: areaId,
      organizationId,
    },
  }),
  false,
  "Area manager must not create branches.",
);

assert.equal(
  canPerformAction(operationsManager, "branches.create", {
    scope: { companyId, countryId, organizationId },
  }),
  true,
  "Operations manager must create branches in scope.",
);

assert.equal(
  canPerformAction(ceo, "branches.create", {
    scope: { companyId, countryId, organizationId },
  }),
  true,
  "CEO must create branches in an authorized business line scope.",
);

assert.equal(
  canPerformAction(operationsManager, "users.invite", {
    roleKey: "gerente_area",
    scope: {
      companyId,
      countryId,
      operationalAreaId: areaId,
      organizationId,
    },
  }),
  true,
  "Operations manager must create area managers in scope.",
);

assert.equal(
  canPerformAction(operationsManager, "users.invite", {
    roleKey: "super_admin",
    scope: { companyId, countryId, organizationId },
  }),
  false,
  "Operations manager must not create super admins.",
);

assert.equal(
  canPerformAction(viewer, "connectors.run", {
    scope: { companyId, countryId, organizationId },
  }),
  false,
  "Viewer must not execute connector sync actions.",
);

assert.equal(
  canPerformAction(operationsManager, "connectors.run", {
    scope: { companyId, countryId, organizationId },
  }),
  false,
  "Operations manager must not execute connector sync actions.",
);

assert.equal(
  canPerformAction(demoBranchManager, "record.read", {
    scope: demoBranchManager.scope,
  }),
  true,
  "DEMO branch manager session must include an assigned branch scope.",
);

assert.equal(
  canPerformAction(demoBranchManager, "record.read", {
    scope: {
      ...demoBranchManager.scope,
      branchId: "outside-demo-branch",
    },
  }),
  false,
  "DEMO branch manager must stay limited to its assigned branch.",
);

assert.equal(
  canPerformAction(demoAreaManager, "record.read", {
    scope: {
      ...demoAreaManager.scope,
      branchId: demoBranchManager.scope.branchId,
    },
  }),
  true,
  "DEMO area manager must read branches inside its area.",
);

assert.equal(
  canPerformAction(demoAreaManager, "record.read", {
    scope: {
      ...demoAreaManager.scope,
      operationalAreaId: "outside-demo-area",
    },
  }),
  false,
  "DEMO area manager must stay limited to its assigned area.",
);

const sourceChecks = [
  "app/protected/[module]/page.tsx",
  "app/protected/overview/page.tsx",
  "app/protected/context/page.tsx",
  "app/api/users/invite/route.ts",
  "app/api/analia-chat/route.ts",
  "app/api/auth/demo-role/route.ts",
  "app/api/auth/demo-session/route.ts",
  "app/forbidden/page.tsx",
  "app/auth/login/page.tsx",
  "app/login/page.tsx",
  "components/app-sidebar.tsx",
  "components/business-module-dashboard.tsx",
  "components/login-form.tsx",
  "lib/auth/demo-scope.ts",
  "lib/server/authorization.ts",
  "lib/server/database.ts",
  "lib/security/authorization-policy.ts",
  "lib/security/environment.ts",
  "supabase/migrations/20260807000100_sprint1_harden_security_rbac.sql",
];

for (const file of sourceChecks) {
  statSync(file);
}

const modulePage = readFileSync("app/protected/[module]/page.tsx", "utf8");
const inviteRoute = readFileSync("app/api/users/invite/route.ts", "utf8");
const analiaRoute = readFileSync("app/api/analia-chat/route.ts", "utf8");
const demoSessionRoute = readFileSync("app/api/auth/demo-session/route.ts", "utf8");
const authLoginPage = readFileSync("app/auth/login/page.tsx", "utf8");
const loginAliasPage = readFileSync("app/login/page.tsx", "utf8");
const loginForm = readFileSync("components/login-form.tsx", "utf8");
const sessionProxy = readFileSync("lib/supabase/proxy.ts", "utf8");
const sidebar = readFileSync("components/app-sidebar.tsx", "utf8");
const demoAdminHelper = readFileSync("lib/auth/demo-admin.ts", "utf8");
const databaseHelper = readFileSync("lib/server/database.ts", "utf8");
const environment = readFileSync("lib/security/environment.ts", "utf8");
const localSession = readFileSync("lib/auth/local-session.ts", "utf8");
const localLoginRoute = readFileSync("app/api/auth/local-login/route.ts", "utf8");
const localPasswordRoute = readFileSync(
  "app/api/auth/local-password/route.ts",
  "utf8",
);
const authorizationService = readFileSync("lib/server/authorization.ts", "utf8");
const requiredPasswordChangeMigration = readFileSync(
  "supabase/migrations/20260810000400_require_local_password_change.sql",
  "utf8",
);
const sprint1Migration = readFileSync(
  "supabase/migrations/20260807000100_sprint1_harden_security_rbac.sql",
  "utf8",
);
const userDashboard = readFileSync(
  "components/business-module-dashboard.tsx",
  "utf8",
);
const forbiddenPage = readFileSync("app/forbidden/page.tsx", "utf8");

assert(
  modulePage.includes("requireProtectedPath(item.href)"),
  "Dynamic protected modules must enforce server-side route authorization.",
);

assert(
  localSession.includes("verifyLocalSessionToken") &&
    localSession.includes("return null") &&
    localSession.includes("!isDemoRuntimeEnvironment()"),
  "Local sessions must reject invalid tokens and require configured secrets outside demo.",
);

assert(
  localLoginRoute.includes("requiresPasswordChange") &&
    localLoginRoute.includes("/auth/update-password") &&
    authorizationService.includes("actor.requiresPasswordChange") &&
    authorizationService.includes("redirect(\"/auth/update-password\")"),
  "Local users marked for password rotation must be redirected before protected access.",
);

assert(
  localPasswordRoute.includes("readLocalSession") &&
    localPasswordRoute.includes("changeAuthenticatedLocalUserPassword") &&
    !localPasswordRoute.includes("service_role") &&
    !localPasswordRoute.includes("NEXT_PUBLIC"),
  "Local password changes must be server-side and require an existing local session.",
);

assert(
  demoAdminHelper.includes("VERCEL_ENV !== \"production\"") &&
    demoAdminHelper.includes("isDemoAdminAllowedByEnvironment") &&
    demoAdminHelper.includes("getDemoRoleFromCookie") &&
    demoAdminHelper.includes("getDemoAdminSessionValue().length >= 32"),
  "DEMO admin and role switch must be controlled by server-side environment checks.",
);

assert(
  environment.includes('"demo"') &&
    environment.includes('"staging"') &&
    environment.includes('"production"') &&
    environment.includes("ANALIZA_APP_ENV") &&
    environment.includes('return "production"') &&
    environment.includes('ANALIZA_ENABLE_DEMO_ADMIN === "true"') &&
    environment.includes("ANALIZA_DISABLE_DEMO_ROLE_SWITCH"),
  "Runtime environment separation must cover demo, staging and production.",
);

assert(
  databaseHelper.includes("assertSafePostgresRuntimeRole") &&
    databaseHelper.includes("rolbypassrls") &&
    databaseHelper.includes("rolsuper") &&
    databaseHelper.includes("request.jwt.claim.sub") &&
    databaseHelper.includes("set local role"),
  "Production database access must verify the real PostgreSQL role and propagate user context before querying.",
);

assert(
  inviteRoute.includes("getCurrentAuthorizationActor") &&
    inviteRoute.includes("canPerformAction") &&
    inviteRoute.includes("APP_URL") &&
    inviteRoute.includes("isProductionRuntimeEnvironment") &&
    !inviteRoute.includes("payload?.actorRole") &&
    !inviteRoute.includes("payload?.actorScope"),
  "Invitation API must derive actor role and scope server-side.",
);

assert(
  analiaRoute.includes("getCurrentAuthorizationActor") &&
    analiaRoute.includes("route.access"),
  "AnaliA API must validate session and route access server-side.",
);

assert(
  sidebar.includes("/api/auth/demo-role") &&
    sidebar.includes("allowDemoRoleSwitch"),
  "DEMO role switch must synchronize through a server-side endpoint.",
);

assert(
  demoSessionRoute.includes("isDemoAdminEnabled") &&
    demoSessionRoute.includes("demoAdminCookieName") &&
    demoSessionRoute.includes("demoRoleCookieName") &&
    demoSessionRoute.includes("getDemoSessionCookieOptions") &&
    !demoSessionRoute.includes("ANALIZA_DEMO_ADMIN_PASSWORD"),
  "Local DEMO session endpoint must be server-side, environment gated, and passwordless.",
);

assert(
  authLoginPage.includes("enableLocalDemoLogin={isDemoAdminEnabled()}") &&
    loginAliasPage.includes('redirect("/auth/login")') &&
    loginForm.includes("Entorno DEMO local") &&
    loginForm.includes("/api/auth/demo-session") &&
    loginForm.includes("Direccion / Super Admin") &&
    loginForm.includes("CEO / Direccion Ejecutiva") &&
    loginForm.includes("Gerente de Operaciones") &&
    loginForm.includes("Gerente de Area") &&
    loginForm.includes("Gerente de Sucursal") &&
    loginForm.includes("Usuario Operativo") &&
    loginForm.includes("Viewer") &&
    !loginForm.match(/type=["']password["'][^>]*value=["'][^"']+["']/i),
  "Login must expose local DEMO profiles only when the server enables demo login.",
);

assert(
  sessionProxy.includes("/api/auth/demo-session") &&
    sessionProxy.includes("/api/auth/local-login") &&
    sessionProxy.includes("publicAuthApiPaths") &&
    sessionProxy.includes("!isPublicAuthPath"),
  "Session proxy must allow public auth APIs while keeping protected routes guarded.",
);

assert(
  !userDashboard.includes("actorRole: activeRole") &&
    !userDashboard.includes("actorScope: actor.scope"),
  "User invitation UI must not submit actor role or actor scope.",
);

assert(
  forbiddenPage.includes("Acceso no autorizado") &&
    forbiddenPage.includes("No tienes permiso"),
  "Forbidden page must present a professional access denied state.",
);

for (const requiredMigrationText of [
  "create or replace function public.current_user_can_access_branch",
  "create or replace function public.current_user_can_access_operational_area",
  "audit_security_principal_change",
  "user_role.changed",
  "user_scope.changed",
  "user_status.changed",
  "audit_logs",
  "assignment_history",
]) {
  assert(
    sprint1Migration.includes(requiredMigrationText),
    `Sprint 1 migration is missing: ${requiredMigrationText}`,
  );
}

assert(
  requiredPasswordChangeMigration.includes("requires_password_change") &&
    requiredPasswordChangeMigration.includes("public.profiles"),
  "Password rotation migration must persist the required-change flag on profiles.",
);

console.log("Sprint 1 security RBAC checks passed.");
