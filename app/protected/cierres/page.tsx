import { Suspense } from "react";

import { PhysiotherapyVerticalDashboard } from "@/components/physiotherapy-vertical-dashboard";
import { requireProtectedPath } from "@/lib/server/authorization";

async function ClosuresGate() {
  await requireProtectedPath("/protected/cierres");

  return <PhysiotherapyVerticalDashboard mode="history" />;
}

export default function ClosuresPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando cierres...
        </div>
      }
    >
      <ClosuresGate />
    </Suspense>
  );
}
