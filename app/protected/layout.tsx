import { AuthButton } from "@/components/auth-button";
import { AppSidebar } from "@/components/app-sidebar";
import { TenantContextHeader } from "@/components/tenant-context-header";
import {
  demoAdminCookieName,
  hasDemoAdminCookie,
} from "@/lib/auth/demo-admin";
import { readLocalSession } from "@/lib/auth/local-session";
import { createClient } from "@/lib/supabase/server";
import type { RoleKey } from "@/lib/tenant/demo-context";
import { hasEnvVars } from "@/lib/utils";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type ProtectedAccess = {
  allowDemoRoleSwitch: boolean;
  roleKey: RoleKey;
};

async function requireProtectedAccess(): Promise<ProtectedAccess> {
  const cookieStore = await cookies();
  const hasDemoAdminSession = hasDemoAdminCookie(
    cookieStore.get(demoAdminCookieName)?.value,
  );

  if (hasDemoAdminSession) {
    return { allowDemoRoleSwitch: true, roleKey: "super_admin" };
  }

  const localSession = readLocalSession(cookieStore);

  if (localSession) {
    return { allowDemoRoleSwitch: false, roleKey: localSession.roleKey };
  }

  if (!hasEnvVars) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims().catch(() => ({
    data: null,
    error: new Error("Supabase claims unavailable"),
  }));

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return { allowDemoRoleSwitch: true, roleKey: "super_admin" };
}

async function ProtectedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireProtectedAccess();

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen w-full">
        <AppSidebar
          allowDemoRoleSwitch={access.allowDemoRoleSwitch}
          roleKey={access.roleKey}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <nav className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
            <div className="flex min-h-16 w-full flex-col gap-3 px-4 py-3 text-sm lg:flex-row lg:items-start lg:justify-between lg:px-5">
              <Link
                href="/protected"
                className="font-semibold lg:hidden"
              >
                Analiza Intelligence
              </Link>
              <TenantContextHeader />
              <Suspense>
                <AuthButton />
              </Suspense>
            </div>
          </nav>
          <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </main>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Verificando acceso autorizado...
        </div>
      }
    >
      <ProtectedShell>{children}</ProtectedShell>
    </Suspense>
  );
}
