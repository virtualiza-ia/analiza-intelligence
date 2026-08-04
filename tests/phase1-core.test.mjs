import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

const migrationPath = "supabase/migrations/20260720000100_phase1_core.sql";
const seedPath = "supabase/seed.sql";

statSync(migrationPath);
statSync(seedPath);

const migration = readFileSync(migrationPath, "utf8");
const seed = readFileSync(seedPath, "utf8");

const requiredTables = [
  "organizations",
  "countries",
  "currencies",
  "companies",
  "branches",
  "profiles",
  "roles",
  "permissions",
  "user_roles",
  "user_country_access",
  "user_company_access",
  "user_branch_access",
  "branch_managers",
  "services",
  "data_sources",
  "audit_logs",
];

for (const table of requiredTables) {
  if (!migration.includes(`create table public.${table}`)) {
    throw new Error(`Missing table in migration: ${table}`);
  }
  if (!migration.includes(`alter table public.${table} enable row level security`)) {
    throw new Error(`Missing RLS enablement for table: ${table}`);
  }
}

const requiredFunctions = [
  "current_user_is_super_admin",
  "current_user_has_role",
  "current_user_can_access_org",
  "current_user_can_access_country",
  "current_user_can_access_company",
  "current_user_can_access_branch",
];

for (const fn of requiredFunctions) {
  if (!migration.includes(`function public.${fn}`)) {
    throw new Error(`Missing RLS helper function: ${fn}`);
  }
}

const roleKeys = [
  "super_admin",
  "webmaster_admin",
  "ceo",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
  "usuario_operativo",
  "viewer",
];

for (const roleKey of roleKeys) {
  if (!seed.includes(roleKey)) {
    throw new Error(`Missing seed role: ${roleKey}`);
  }
}

const countries = [
  "Guatemala",
  "Belice",
  "El Salvador",
  "Honduras",
  "Nicaragua",
  "Costa Rica",
  "Panama",
];

for (const country of countries) {
  if (!seed.includes(country)) {
    throw new Error(`Missing seed country: ${country}`);
  }
}

const signUpPage = readFileSync("app/auth/sign-up/page.tsx", "utf8");
const loginForm = readFileSync("components/login-form.tsx", "utf8");
const localAuthRoute = readFileSync("app/auth/local/route.ts", "utf8");
const localSession = readFileSync("lib/auth/session.ts", "utf8");
const removedSignUpFormExists = (() => {
  try {
    statSync("components/sign-up-form.tsx");
    return true;
  } catch {
    return false;
  }
})();

if (!signUpPage.includes("Activa tu cuenta") || !signUpPage.includes("getInvitationPreview")) {
  throw new Error("Invitation-only account activation page is missing.");
}

for (const requiredRoleText of [
  "Superadministrador",
  "CEO",
  "Gerente de operaciones",
  "Gerente de area",
  "Gerente de sucursal",
  "Usuario operativo",
  "Viewer",
]) {
  if (!signUpPage.includes(requiredRoleText) && !seed.includes(requiredRoleText)) {
    throw new Error(`Missing four-role model text: ${requiredRoleText}`);
  }
}

if (!loginForm.includes("Crear cuenta")) {
  throw new Error("Login form should link to controlled account creation.");
}

if (!loginForm.includes('fetch("/auth/local"')) {
  throw new Error("Login form should use local server-side authentication.");
}

if (!localAuthRoute.includes("authenticatePassword")) {
  throw new Error("Local auth route should verify password hashes.");
}

if (!localAuthRoute.includes("localSessionCookieName")) {
  throw new Error("Local auth route should set an individual session cookie.");
}

if (!localSession.includes("hashSessionToken")) {
  throw new Error("Local sessions should persist only a token hash.");
}

if (removedSignUpFormExists) {
  throw new Error("Public self-registration form must not exist.");
}

let signUpCalls = "";
try {
  signUpCalls = execFileSync(
    "rg",
    ["auth.signUp", "app", "components", "lib"],
    { encoding: "utf8" },
  );
} catch (error) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("status" in error) ||
    error.status !== 1
  ) {
    throw error;
  }
}

if (signUpCalls.trim().length > 0) {
  throw new Error(`Unexpected public self-registration behavior:\n${signUpCalls}`);
}

if (
  signUpPage.includes('type="password"') ||
  signUpPage.includes('id="password"')
) {
  throw new Error("Controlled account creation page must not ask for a password.");
}

console.log("Phase 1 core checks passed.");
