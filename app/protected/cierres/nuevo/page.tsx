import { Suspense } from "react";
import { connection } from "next/server";

import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { requireProtectedPath } from "@/lib/server/authorization";

type NewClosurePageProps = {
  searchParams?: Promise<{
    line?: string | string[];
  }>;
};

async function NewClosureGate({
  searchParams,
}: {
  searchParams?: NewClosurePageProps["searchParams"];
}) {
  await connection();

  const params = searchParams ? await searchParams : {};
  const actor = await requireProtectedPath("/protected/cierres/nuevo");

  return (
    <MonthlyClosureRouter actor={actor} line={params.line} mode="new-closure" />
  );
}

export default function NewClosurePage({
  searchParams,
}: NewClosurePageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 py-10 text-sm text-muted-foreground">
          Cargando formulario...
        </div>
      }
    >
      <NewClosureGate searchParams={searchParams} />
    </Suspense>
  );
}
