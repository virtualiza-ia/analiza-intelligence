import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

import {
  canAccessProtectedPath,
  canPerformAction,
} from "../lib/security/authorization-policy.ts";
import { getDemoScopeForRole } from "../lib/auth/demo-scope.ts";
import { canUseDemoFeatures } from "../lib/security/environment.ts";

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
  true,
  "Operations manager must execute connector sync actions in scope.",
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
  "app/login/page.tsx",
  "components/app-sidebar.tsx",
  "components/business-module-dashboard.tsx",
  "components/login-form.tsx",
  "lib/auth/demo-scope.ts",
  "lib/server/authorization.ts",
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
const loginAliasPage = readFileSync("app/login/page.tsx", "utf8");
const loginForm = readFileSync("components/login-form.tsx", "utf8");
const sessionProxy = readFileSync("lib/supabase/proxy.ts", "utf8");
const sidebar = readFileSync("components/app-sidebar.tsx", "utf8");
const demoAdminHelper = readFileSync("lib/auth/demo-admin.ts", "utf8");
const environment = readFileSync("lib/security/environment.ts", "utf8");
const localSession = readFileSync("lib/auth/local-session.ts", "utf8");
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
  demoAdminHelper.includes("VERCEL_ENV !== \"production\"") &&
    demoAdminHelper.includes("isDemoAdminAllowedByEnvironment") &&
    demoAdminHelper.includes("getDemoRoleFromCookie"),
  "DEMO admin and role switch must be controlled by server-side environment checks.",
);

assert(
  environment.includes('"demo"') &&
    environment.includes('"staging"') &&
    environment.includes('"production"') &&
    environment.includes("ANALIZA_APP_ENV") &&
    environment.includes("ANALIZA_DISABLE_DEMO_ROLE_SWITCH"),
  "Runtime environment separation must cover demo, staging and production.",
);

assert(
  inviteRoute.includes("getCurrentAuthorizationActor") &&
    inviteRoute.includes("canPerformAction") &&
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
  loginAliasPage.includes("enableLocalDemoLogin={isDemoAdminEnabled()}") &&
    loginForm.includes("Entorno DEMO local") &&
    loginForm.includes("/api/auth/demo-session") &&
    loginForm.includes("Direccion / Super Admin") &&
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

console.log("Sprint 1 security RBAC checks passed.");
