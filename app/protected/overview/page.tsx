import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ExecutiveDashboard } from "@/components/executive-dashboard";
import { demoAdminCookieName, hasDemoAdminCookie } from "@/lib/auth/demo-admin";
import { readLocalSession } from "@/lib/auth/local-session";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

async function OverviewGate() {
  const cookieStore = await cookies();
  const hasDemoAdminSession = hasDemoAdminCookie(
    cookieStore.get(demoAdminCookieName)?.value,
  );

  if (hasDemoAdminSession) {
    return <ExecutiveDashboard />;
  }

  const localSession = readLocalSession(cookieStore);

  if (localSession) {
    return <ExecutiveDashboard />;
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

  return <ExecutiveDashboard />;
}

export default function OverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando espacio de trabajo...
        </div>
      }
    >
      <OverviewGate />
    </Suspense>
  );
}
