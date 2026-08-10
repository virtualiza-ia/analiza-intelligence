import { Suspense } from "react";

import { PhysiotherapyVerticalDashboard } from "@/components/physiotherapy-vertical-dashboard";
import { requireProtectedPath } from "@/lib/server/authorization";

async function ResultsGate() {
  await requireProtectedPath("/protected/resultados");

  return <PhysiotherapyVerticalDashboard mode="results" />;
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando resultados...
        </div>
      }
    >
      <ResultsGate />
    </Suspense>
  );
}
