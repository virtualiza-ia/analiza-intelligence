import {
  isDemoAdminAllowedByEnvironment,
  isDemoRoleSwitchAllowedByEnvironment,
} from "@/lib/security/environment";
import { roleKeys, type RoleKey } from "@/lib/tenant/demo-context";

export const demoAdminCookieName = "analiza_demo_admin";
export const demoRoleCookieName = "analiza_demo_role";
export const demoAdminEmail = "admin.demo@analiza.local";
export const demoOrganizationId = "10000000-0000-4000-8000-000000000001";

export function getDemoAdminEmail() {
  return process.env.ANALIZA_DEMO_ADMIN_EMAIL ?? demoAdminEmail;
}

export function getDemoAdminPassword() {
  return process.env.ANALIZA_DEMO_ADMIN_PASSWORD;
}

export function getDemoAdminSessionValue() {
  return process.env.ANALIZA_DEMO_ADMIN_SESSION_TOKEN ?? "enabled";
}

export function isDemoAdminEnabled() {
  return (
    process.env.VERCEL_ENV !== "production" &&
    isDemoAdminAllowedByEnvironment()
  );
}

export function hasDemoAdminCookie(value: string | undefined) {
  return isDemoAdminEnabled() && value === getDemoAdminSessionValue();
}

export function isDemoRoleSwitchEnabled() {
  return isDemoAdminEnabled() && isDemoRoleSwitchAllowedByEnvironment();
}

export function getDemoRoleFromCookie(value: string | undefined): RoleKey | null {
  if (!isDemoRoleSwitchEnabled()) {
    return null;
  }

  return roleKeys.includes(value as RoleKey) ? (value as RoleKey) : null;
}

export function getDemoSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.VERCEL_ENV === "production",
  };
}

export function getExpiredDemoSessionCookieOptions() {
  return {
    ...getDemoSessionCookieOptions(),
    maxAge: 0,
  };
}
