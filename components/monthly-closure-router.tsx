import { LaboratoryVerticalDashboard } from "@/components/laboratory-vertical-dashboard";
import { ImagingVerticalDashboard } from "@/components/imaging-vertical-dashboard";
import { PhysiotherapyVerticalDashboard } from "@/components/physiotherapy-vertical-dashboard";
import type { AuthorizationActor } from "@/lib/security/authorization-policy";
import { demoCompanies } from "@/lib/tenant/demo-context";

type DashboardMode =
  | "branch-home"
  | "new-closure"
  | "history"
  | "results"
  | "targets"
  | "insights"
  | "operations"
  | "overview";

type MonthlyClosureRouterProps = {
  actor: AuthorizationActor;
  line?: string | string[];
  mode: DashboardMode;
};

function requestedLine(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim().toLowerCase();

  if (
    normalizedValue === "imagenes" ||
    normalizedValue === "imagen" ||
    normalizedValue === "imaging" ||
    normalizedValue === "img"
  ) {
    return "imagenes";
  }

  if (
    normalizedValue === "laboratorio" ||
    normalizedValue === "laboratory" ||
    normalizedValue === "lab"
  ) {
    return "laboratorio";
  }

  if (
    normalizedValue === "fisioterapia" ||
    normalizedValue === "physiotherapy" ||
    normalizedValue === "fisio"
  ) {
    return "fisioterapia";
  }

  return null;
}

function scopedCompanyUnit(actor: AuthorizationActor) {
  return (
    demoCompanies.find((company) => company.id === actor.scope.companyId)
      ?.unitType ?? null
  );
}

export function MonthlyClosureRouter({
  actor,
  line,
  mode,
}: MonthlyClosureRouterProps) {
  const selectedLine = requestedLine(line) ?? scopedCompanyUnit(actor);

  if (selectedLine === "laboratorio") {
    return <LaboratoryVerticalDashboard mode={mode} />;
  }

  if (selectedLine === "imagenes") {
    return <ImagingVerticalDashboard mode={mode} />;
  }

  return <PhysiotherapyVerticalDashboard mode={mode} />;
}
