import { notFound } from "next/navigation";
import { connection } from "next/server";

import { BusinessModuleDashboard } from "@/components/business-module-dashboard";
import { AccountProfileDashboard } from "@/components/account-profile-dashboard";
import { CrmConnectorsDashboard } from "@/components/crm-connectors-dashboard";
import { ImportOperationsDashboard } from "@/components/import-operations-dashboard";
import { MonthlyClosureRouter } from "@/components/monthly-closure-router";
import { Badge } from "@/components/ui/badge";
import { moduleConfigs } from "@/lib/analytics/demo-business-modules";
import { navigationItems } from "@/lib/navigation";
import { requireProtectedPath } from "@/lib/server/authorization";
import { getOfficialExecutiveSnapshot } from "@/lib/server/official-bi";
import type { OfficialDashboardMode } from "@/lib/server/official-bi";
import { isDemoRuntimeEnvironment } from "@/lib/security/environment";

type ModulePageProps = {
  params: Promise<{
    module: string;
  }>;
  searchParams?: Promise<{
    branch?: string;
    company?: string;
    country?: string;
    from?: string;
    line?: string;
    to?: string;
  }>;
};

const operationsModuleSlugs = [
  "gerentes",
] as const;
const staticProtectedModuleSlugs = new Set([
  "cierres",
  "mi-sucursal",
  "resultados",
]);

export function generateStaticParams() {
  return navigationItems
    .filter((item) => item.href !== "/protected/overview")
    .map((item) => item.href.replace("/protected/", ""))
    .filter(
      (module) =>
        !module.includes("/") && !staticProtectedModuleSlugs.has(module),
    )
    .map((item) => ({
      module: item,
    }));
}

async function renderOfficialDataModule(
  mode: OfficialDashboardMode,
  actor: Awaited<ReturnType<typeof requireProtectedPath>>,
  searchParams: ModulePageProps["searchParams"],
  businessLineIdOverride?: string,
) {
  const params = searchParams ? await searchParams : {};
  const snapshot = await getOfficialExecutiveSnapshot(actor, {
    branchId: params.branch,
    businessLineId: businessLineIdOverride ?? params.line,
    companyId: params.company,
    countryId: params.country,
    periodEnd: params.to,
    periodStart: params.from,
  });
  const { OfficialExecutiveDataDashboard } = await import(
    "@/components/official-executive-data-dashboard"
  );

  return <OfficialExecutiveDataDashboard mode={mode} snapshot={snapshot} />;
}

export default async function ModulePage({
  params,
  searchParams,
}: ModulePageProps) {
  await connection();

  const { module } = await params;
  const item = navigationItems.find(
    (navigationItem) => navigationItem.href === `/protected/${module}`,
  );

  if (!item) {
    notFound();
  }

  const actor = await requireProtectedPath(item.href);

  const Icon = item.icon;

  if (module === "citas") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("appointments", actor, searchParams);
    }

    const { PatientFlowDemandDashboard } = await import(
      "@/components/patient-flow-demand-dashboard"
    );

    return <PatientFlowDemandDashboard />;
  }

  if (module === "capacidad") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("capacity", actor, searchParams);
    }

    const { CapacityOccupancyDashboard } = await import(
      "@/components/capacity-occupancy-dashboard"
    );

    return <CapacityOccupancyDashboard />;
  }

  if (module === "sucursales") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("branches", actor, searchParams);
    }

    const { BranchNetworkDashboard } = await import(
      "@/components/branch-network-dashboard"
    );

    return <BranchNetworkDashboard />;
  }

  if (module === "profesionales") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("professionals", actor, searchParams);
    }

    const { ProfessionalPerformanceDashboard } = await import(
      "@/components/professional-performance-dashboard"
    );

    return <ProfessionalPerformanceDashboard />;
  }

  if (module === "servicios") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("services", actor, searchParams);
    }

    const { ServicePortfolioDashboard } = await import(
      "@/components/service-portfolio-dashboard"
    );

    return <ServicePortfolioDashboard />;
  }

  if (module === "laboratorio") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule(
        "laboratory",
        actor,
        searchParams,
        "business-line-laboratorio",
      );
    }

    const { LaboratoryPresentationDashboard } = await import(
      "@/components/laboratory-presentation-dashboard"
    );

    return <LaboratoryPresentationDashboard />;
  }

  if (module === "fisioterapia") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule(
        "physiotherapy",
        actor,
        searchParams,
        "business-line-fisioterapia",
      );
    }

    const { PhysiotherapyPresentationDashboard } = await import(
      "@/components/physiotherapy-presentation-dashboard"
    );

    return <PhysiotherapyPresentationDashboard />;
  }

  if (module === "imagenes") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule(
        "imaging",
        actor,
        searchParams,
        "business-line-imagenes",
      );
    }

    const { ImagingPresentationDashboard } = await import(
      "@/components/imaging-presentation-dashboard"
    );

    return <ImagingPresentationDashboard />;
  }

  if (module === "insights") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("insights", actor, searchParams);
    }

    const { InsightsIntelligenceDashboard } = await import(
      "@/components/insights-intelligence-dashboard"
    );

    return <InsightsIntelligenceDashboard />;
  }

  if (module === "importaciones") {
    return <ImportOperationsDashboard roleKey={actor.roleKey} />;
  }

  if (module === "plantillas") {
    const resolvedSearchParams = searchParams ? await searchParams : {};

    return (
      <MonthlyClosureRouter
        actor={actor}
        line={resolvedSearchParams.line}
        mode="new-closure"
      />
    );
  }

  if (module === "conectores" || module === "apis") {
    return <CrmConnectorsDashboard />;
  }

  if (module === "calidad-datos") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("quality", actor, searchParams);
    }

    const { DataQualityAnaliaDashboard } = await import(
      "@/components/data-quality-analia-dashboard"
    );

    return <DataQualityAnaliaDashboard />;
  }

  if (module === "metas") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("targets", actor, searchParams);
    }

    const { GoalsAdvancesDashboard } = await import(
      "@/components/goals-advances-dashboard"
    );

    return <GoalsAdvancesDashboard />;
  }

  if (module === "configuracion") {
    return <AccountProfileDashboard />;
  }

  if (
    operationsModuleSlugs.includes(
      module as (typeof operationsModuleSlugs)[number],
    )
  ) {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("managers", actor, searchParams);
    }

    const { OperationsModule } = await import("@/components/operations-modules");

    return <OperationsModule module={module} />;
  }

  if (module === "operacion") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("operations", actor, searchParams);
    }

    const { ExecutiveOperationDashboard } = await import(
      "@/components/executive-operation-dashboard"
    );

    return <ExecutiveOperationDashboard />;
  }

  if (module === "finanzas") {
    if (!isDemoRuntimeEnvironment()) {
      return renderOfficialDataModule("finances", actor, searchParams);
    }

    const { FinancialHealthDashboard } = await import(
      "@/components/financial-health-dashboard"
    );

    return <FinancialHealthDashboard />;
  }

  if (moduleConfigs[module]) {
    return (
      <BusinessModuleDashboard
        allowDemoRoleSwitch={actor.allowDemoRoleSwitch}
        actorScope={actor.scope}
        enableDemoFixtures={isDemoRuntimeEnvironment()}
        module={module}
        roleKey={actor.roleKey}
      />
    );
  }

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3">
        <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
          Entorno DEMO
        </Badge>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md border bg-card">
            <Icon className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              {item.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Modulo preparado para fases posteriores.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
