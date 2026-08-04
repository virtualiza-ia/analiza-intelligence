import { Suspense } from "react";

import { ContextSelectionForm } from "@/components/context-selection-form";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import {
  demoBranches,
  demoBusinessLineOptions,
  demoCompanyOptions,
  demoCountryOptions,
} from "@/lib/tenant/demo-context";

async function ContextSelectionGate() {
  const user = await requireAuthenticatedUser();

  return (
      <ContextSelectionForm
        branches={demoBranches}
        businessLines={demoBusinessLineOptions}
        companies={demoCompanyOptions}
        countries={demoCountryOptions}
        userEmail={user.email}
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
