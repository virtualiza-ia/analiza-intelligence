import { Suspense } from "react";

import { PhysiotherapyVerticalDashboard } from "@/components/physiotherapy-vertical-dashboard";
import { requireProtectedPath } from "@/lib/server/authorization";

async function MyBranchGate() {
  await requireProtectedPath("/protected/mi-sucursal");

  return <PhysiotherapyVerticalDashboard mode="branch-home" />;
}

export default function MyBranchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando mi sucursal...
        </div>
      }
    >
      <MyBranchGate />
    </Suspense>
  );
}
