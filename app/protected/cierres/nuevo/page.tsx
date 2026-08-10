import { Suspense } from "react";

import { PhysiotherapyVerticalDashboard } from "@/components/physiotherapy-vertical-dashboard";
import { requireProtectedPath } from "@/lib/server/authorization";

async function NewClosureGate() {
  await requireProtectedPath("/protected/cierres/nuevo");

  return <PhysiotherapyVerticalDashboard mode="new-closure" />;
}

export default function NewClosurePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando formulario...
        </div>
      }
    >
      <NewClosureGate />
    </Suspense>
  );
}
