import { Suspense } from "react";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { requireProtectedPath } from "@/lib/server/authorization";

type NewClosurePageProps = {
  searchParams?: Promise<{
    line?: string | string[];
  }>;
};

async function NewClosureGate({ line }: { line?: string | string[] }) {
  const actor = await requireProtectedPath("/protected/cierres/nuevo");

  return <MonthlyClosureRouter actor={actor} line={line} mode="new-closure" />;
}

export default async function NewClosurePage({
  searchParams,
}: NewClosurePageProps) {
  const params = searchParams ? await searchParams : {};

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando formulario...
        </div>
      }
    >
      <NewClosureGate line={params.line} />
    </Suspense>
  );
}
