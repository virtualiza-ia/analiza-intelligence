import { Suspense } from "react";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { requireProtectedPath } from "@/lib/server/authorization";

type ClosuresPageProps = {
  searchParams?: Promise<{
    line?: string | string[];
  }>;
};

async function ClosuresGate({ line }: { line?: string | string[] }) {
  const actor = await requireProtectedPath("/protected/cierres");

  return <MonthlyClosureRouter actor={actor} line={line} mode="history" />;
}

export default async function ClosuresPage({ searchParams }: ClosuresPageProps) {
  const params = searchParams ? await searchParams : {};

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando cierres...
        </div>
      }
    >
      <ClosuresGate line={params.line} />
    </Suspense>
  );
}
