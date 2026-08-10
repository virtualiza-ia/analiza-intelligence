import { notFound } from "next/navigation";

import { BranchNetworkDashboard } from "@/components/branch-network-dashboard";
import { BusinessModuleDashboard } from "@/components/business-module-dashboard";
import { CapacityOccupancyDashboard } from "@/components/capacity-occupancy-dashboard";
import { CrmConnectorsDashboard } from "@/components/crm-connectors-dashboard";
import { DataQualityAnaliaDashboard } from "@/components/data-quality-analia-dashboard";
import { ExecutiveOperationDashboard } from "@/components/executive-operation-dashboard";
import { FinancialHealthDashboard } from "@/components/financial-health-dashboard";
import { GoalsAdvancesDashboard } from "@/components/goals-advances-dashboard";
import { ImagingPresentationDashboard } from "@/components/imaging-presentation-dashboard";
import { InsightsIntelligenceDashboard } from "@/components/insights-intelligence-dashboard";
import { ImportOperationsDashboard } from "@/components/import-operations-dashboard";
import { LaboratoryPresentationDashboard } from "@/components/laboratory-presentation-dashboard";
import { ManualMonthlyEntryDashboard } from "@/components/manual-monthly-entry-dashboard";
import { OperationsModule } from "@/components/operations-modules";
import { PatientFlowDemandDashboard } from "@/components/patient-flow-demand-dashboard";
import { PhysiotherapyPresentationDashboard } from "@/components/physiotherapy-presentation-dashboard";
import { ProfessionalPerformanceDashboard } from "@/components/professional-performance-dashboard";
import { ServicePortfolioDashboard } from "@/components/service-portfolio-dashboard";
import { Badge } from "@/components/ui/badge";
import { moduleConfigs } from "@/lib/analytics/demo-business-modules";
import { navigationItems } from "@/lib/navigation";
import { requireProtectedPath } from "@/lib/server/authorization";
import { isDemoRuntimeEnvironment } from "@/lib/security/environment";

type ModulePageProps = {
  params: Promise<{
    module: string;
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

export default async function ModulePage({ params }: ModulePageProps) {
  const { module } = await params;
  const item = navigationItems.find(
    (navigationItem) => navigationItem.href === `/protected/${module}`,
  );

  if (!item) {
    notFound();
  }

  await requireProtectedPath(item.href);

  const Icon = item.icon;

  if (module === "citas") {
    return <PatientFlowDemandDashboard />;
  }

  if (module === "capacidad") {
    return <CapacityOccupancyDashboard />;
  }

  if (module === "sucursales") {
    return <BranchNetworkDashboard />;
  }

  if (module === "profesionales") {
    return <ProfessionalPerformanceDashboard />;
  }

  if (module === "servicios") {
    return <ServicePortfolioDashboard />;
  }

  if (module === "laboratorio") {
    return <LaboratoryPresentationDashboard />;
  }

  if (module === "fisioterapia") {
    return <PhysiotherapyPresentationDashboard />;
  }

  if (module === "imagenes") {
    return <ImagingPresentationDashboard />;
  }

  if (module === "insights") {
    return <InsightsIntelligenceDashboard />;
  }

  if (module === "importaciones") {
    return <ImportOperationsDashboard />;
  }

  if (module === "plantillas") {
    return (
      <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
        <ManualMonthlyEntryDashboard />
      </section>
    );
  }

  if (module === "conectores" || module === "apis") {
    return <CrmConnectorsDashboard />;
  }

  if (module === "calidad-datos") {
    return <DataQualityAnaliaDashboard />;
  }

  if (module === "metas") {
    return <GoalsAdvancesDashboard />;
  }

  if (
    operationsModuleSlugs.includes(
      module as (typeof operationsModuleSlugs)[number],
    )
  ) {
    return <OperationsModule module={module} />;
  }

  if (module === "operacion") {
    return <ExecutiveOperationDashboard />;
  }

  if (module === "finanzas") {
    return <FinancialHealthDashboard />;
  }

  if (moduleConfigs[module]) {
    return (
      <BusinessModuleDashboard
        enableDemoFixtures={isDemoRuntimeEnvironment()}
        module={module}
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
