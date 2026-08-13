import { readFileSync, statSync } from "node:fs";

const protectedLayoutPath = "app/protected/layout.tsx";
const authorizationPath = "lib/server/authorization.ts";
const sidebarPath = "components/app-sidebar.tsx";
const headerPath = "components/tenant-context-header.tsx";
const branchDashboardPath = "components/branch-network-dashboard.tsx";
const currentAccessPath = "lib/tenant/current-user-access.ts";
const sessionRoutePath = "app/api/auth/local-session/route.ts";
const localAuthPath = "lib/server/local-auth.ts";

for (const file of [
  protectedLayoutPath,
  authorizationPath,
  sidebarPath,
  headerPath,
  branchDashboardPath,
  currentAccessPath,
  sessionRoutePath,
  localAuthPath,
]) {
  statSync(file);
}

const protectedLayout = readFileSync(protectedLayoutPath, "utf8");
const authorization = readFileSync(authorizationPath, "utf8");
const sidebar = readFileSync(sidebarPath, "utf8");
const header = readFileSync(headerPath, "utf8");
const branchDashboard = readFileSync(branchDashboardPath, "utf8");
const currentAccess = readFileSync(currentAccessPath, "utf8");
const sessionRoute = readFileSync(sessionRoutePath, "utf8");
const localAuth = readFileSync(localAuthPath, "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  protectedLayout.includes("requireProtectedAccess") &&
    authorization.includes("allowDemoRoleSwitch: false") &&
    authorization.includes("readLocalSession"),
  "Protected access must disable demo role switching for real local sessions.",
);

assert(
  sidebar.includes("!allowDemoRoleSwitch") &&
    sidebar.includes("window.localStorage.setItem(roleStorageKey, roleKey)") &&
    sidebar.includes("Rol DEMO"),
  "Sidebar must pin the real role and only expose the DEMO role selector when allowed.",
);

assert(
  currentAccess.includes("isBranchManagerScopedAccess") &&
    currentAccess.includes("branchName") &&
    currentAccess.includes("/api/auth/local-session"),
  "Current user access helper must expose branch-scoped session data.",
);

assert(
  sessionRoute.includes("getAuthenticatedLocalUserAccess") &&
    sessionRoute.includes("readLocalSession"),
  "Local session API must return current user role and scope from PostgreSQL.",
);

for (const requiredLocalAuthText of [
  "coalesce(ur.branch_id, p.default_branch_id)",
  "public.operational_areas",
  "branch_name",
  "company_name",
]) {
  assert(
    localAuth.includes(requiredLocalAuthText),
    `Local auth access query is missing: ${requiredLocalAuthText}`,
  );
}

assert(
  header.includes("fetchCurrentUserAccess") &&
    header.includes("isBranchManagerScopedAccess") &&
    header.includes("scopedCompanyAccess") &&
    header.includes("isLineLocked") &&
    header.includes("Acceso de sucursal") &&
    header.includes("Linea asignada") &&
    header.includes("setAdvancedFiltersOpen(false)"),
  "Tenant header must lock real scoped users to their assigned business line and branch when applicable.",
);

assert(
  branchDashboard.includes("isBranchManagerScopedAccess") &&
    branchDashboard.includes("No hay filtros para cambiar de sucursal") &&
    branchDashboard.includes("Sin cierre cargado para esta sucursal") &&
    !branchDashboard.includes("screen.records.slice(0, 1)") &&
    !branchDashboard.includes("??\n    screen.records[0]"),
  "Branch dashboard must not fall back to full-network data for branch managers.",
);
