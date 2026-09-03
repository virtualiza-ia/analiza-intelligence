import { redirect } from "next/navigation";

import { requireProtectedPath } from "@/lib/server/authorization";

type NewClosurePageProps = {
  searchParams?: Promise<{
    line?: string | string[];
  }>;
};

function readFirstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function NewClosurePage({
  searchParams,
}: NewClosurePageProps) {
  const actor = await requireProtectedPath("/protected/cierres/nuevo");
  const params = searchParams ? await searchParams : {};
  const line = readFirstParam(params.line);
  const query = new URLSearchParams();
  const destination =
    actor.roleKey === "gerente_sucursal" ||
    actor.roleKey === "usuario_operativo"
      ? "/protected/plantillas"
      : "/protected/importaciones";

  if (line) {
    query.set("line", line);
  }

  const queryString = query.toString();

  redirect(`${destination}${queryString ? `?${queryString}` : ""}`);
}
