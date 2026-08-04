export const demoAdminCookieName = "analiza_demo_admin";
export const demoAdminEmail = "admin.demo@analiza.local";

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
  if (process.env.ANALIZA_ENABLE_DEMO_ADMIN === "true") {
    return true;
  }

  return (
    process.env.ANALIZA_DISABLE_DEMO_ADMIN !== "true" &&
    process.env.VERCEL_ENV !== "production"
  );
}

export function hasDemoAdminCookie(value: string | undefined) {
  return isDemoAdminEnabled() && value === getDemoAdminSessionValue();
}
