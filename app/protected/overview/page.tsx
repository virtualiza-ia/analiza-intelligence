import { Suspense } from "react";

import { ExecutiveDashboard } from "@/components/executive-dashboard";
import { requireAuthenticatedUser } from "@/lib/auth/session";

async function OverviewGate() {
  await requireAuthenticatedUser();
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
