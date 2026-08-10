import { Suspense } from "react";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { requireProtectedPath } from "@/lib/server/authorization";

type ResultsPageProps = {
  searchParams?: Promise<{
    line?: string | string[];
  }>;
};

async function ResultsGate({ line }: { line?: string | string[] }) {
  const actor = await requireProtectedPath("/protected/resultados");

  return <MonthlyClosureRouter actor={actor} line={line} mode="results" />;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = searchParams ? await searchParams : {};

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando resultados...
        </div>
      }
    >
      <ResultsGate line={params.line} />
    </Suspense>
  );
}
