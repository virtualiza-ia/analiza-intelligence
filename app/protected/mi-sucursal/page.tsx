import { Suspense } from "react";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { requireProtectedPath } from "@/lib/server/authorization";

type MyBranchPageProps = {
  searchParams?: Promise<{
    line?: string | string[];
  }>;
};

async function MyBranchGate({ line }: { line?: string | string[] }) {
  const actor = await requireProtectedPath("/protected/mi-sucursal");

  return <MonthlyClosureRouter actor={actor} line={line} mode="branch-home" />;
}

export default async function MyBranchPage({ searchParams }: MyBranchPageProps) {
  const params = searchParams ? await searchParams : {};

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando mi sucursal...
        </div>
      }
    >
      <MyBranchGate line={params.line} />
    </Suspense>
  );
}
