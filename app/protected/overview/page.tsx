import { Suspense } from "react";

import { ExecutiveDashboard } from "@/components/executive-dashboard";
import { requireProtectedPath } from "@/lib/server/authorization";

async function OverviewGate() {
  await requireProtectedPath("/protected/overview");

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
