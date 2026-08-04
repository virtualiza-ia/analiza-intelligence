import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ContextSelectionForm } from "@/components/context-selection-form";
import {
  demoAdminCookieName,
  getDemoAdminEmail,
  hasDemoAdminCookie,
} from "@/lib/auth/demo-admin";
import { createClient } from "@/lib/supabase/server";
import {
  demoBranches,
  demoBusinessLineOptions,
  demoCompanyOptions,
  demoCountryOptions,
} from "@/lib/tenant/demo-context";
import { hasEnvVars } from "@/lib/utils";

function getClaimString(claims: unknown, key: string) {
  if (typeof claims !== "object" || claims === null) {
    return null;
  }

  const value = (claims as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

async function ContextSelectionGate() {
  const cookieStore = await cookies();
  const hasDemoAdminSession = hasDemoAdminCookie(
    cookieStore.get(demoAdminCookieName)?.value,
  );

  if (hasDemoAdminSession) {
    return (
      <ContextSelectionForm
        branches={demoBranches}
        businessLines={demoBusinessLineOptions}
        companies={demoCompanyOptions}
        countries={demoCountryOptions}
        userEmail={getDemoAdminEmail()}
      />
    );
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

  return (
      <ContextSelectionForm
        branches={demoBranches}
        businessLines={demoBusinessLineOptions}
        companies={demoCompanyOptions}
        countries={demoCountryOptions}
        userEmail={getClaimString(data.claims, "email") ?? "usuario autorizado"}
      />
  );
}

export default function ContextPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando contexto autorizado...
        </div>
      }
    >
      <ContextSelectionGate />
    </Suspense>
  );
}
