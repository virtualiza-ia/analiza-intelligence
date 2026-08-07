import { Suspense } from "react";

import { ContextSelectionForm } from "@/components/context-selection-form";
import { requireProtectedPath } from "@/lib/server/authorization";
import {
  demoBranches,
  demoBusinessLineOptions,
  demoCompanyOptions,
  demoCountryOptions,
} from "@/lib/tenant/demo-context";

async function ContextSelectionGate() {
  const access = await requireProtectedPath("/protected/context");

  return (
    <ContextSelectionForm
      branches={demoBranches}
      businessLines={demoBusinessLineOptions}
      companies={demoCompanyOptions}
      countries={demoCountryOptions}
      userEmail={access.email}
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
