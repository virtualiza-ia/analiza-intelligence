import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Gauge,
  Lightbulb,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
  OfficialDashboardMode,
  OfficialExecutiveSnapshot,
  OfficialInsight,
  OfficialKpiCategory,
  OfficialKpiRecord,
  OfficialLineSummary,
  OfficialTargetComparison,
} from "@/lib/server/official-bi";
import { cn } from "@/lib/utils";

type OfficialExecutiveDataDashboardProps = {
  mode: OfficialDashboardMode;
  snapshot: OfficialExecutiveSnapshot;
};

type OfficialBranchSummary = OfficialExecutiveSnapshot["branchSummaries"][number];

const categoryLabels: Record<OfficialKpiCategory, string> = {
  activity: "Actividad",
  appointments: "Citas",
  capacity: "Capacidad",
  financial: "Finanzas",
  general: "General",
  management: "Gerencia",
  operations: "Operacion",
  professionals: "Profesionales",
  quality: "Calidad",
  services: "Servicios",
};

const kpiCategoriesByMode: Partial<
  Record<OfficialDashboardMode, readonly OfficialKpiCategory[]>
> = {
  appointments: ["appointments"],
  capacity: ["capacity"],
  finances: ["financial"],
  managers: ["management"],
  operations: ["operations"],
  professionals: ["professionals"],
  quality: ["quality"],
  services: ["services"],
} satisfies Partial<Record<OfficialDashboardMode, OfficialKpiCategory[]>>;

const lineModes: OfficialDashboardMode[] = [
  "imaging",
  "laboratory",
  "physiotherapy",
];

function formatNumber(value: number | null, unit?: string) {
  if (value === null) {
    return "Sin dato";
  }

  if (unit === "currency") {
    return new Intl.NumberFormat("en-US", {
      currency: "USD",
      maximumFractionDigits: 0,
      style: "currency",
    }).format(value);
  }

  if (unit === "ratio") {
    return `${Math.round(value * 1000) / 10}%`;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatKpiValue(kpi: OfficialKpiRecord) {
  if (kpi.status !== "CALCULABLE" || kpi.value === null) {
    return "No calculable con la informacion disponible";
  }

  return formatNumber(kpi.value, kpi.unit);
}

function formatPercent(value: number | null) {
  return value === null ? "Sin meta" : `${Math.round(value * 1000) / 10}%`;
}

function formatQuality(value: number | null) {
  return value === null ? "Sin dato" : `${Math.round(value * 10) / 10}/100`;
}

function statusLabel(
  status: OfficialLineSummary["status"] | OfficialTargetComparison["status"],
) {
  const labels = {
    critico: "Requiere atencion",
    cumplido: "Cumplido",
    sin_meta: "Sin meta aprobada",
    sin_resultado: "Sin resultado",
    vigilar: "Vigilar",
  } as const;

  return labels[status];
}

function statusClass(
  status: OfficialLineSummary["status"] | OfficialTargetComparison["status"],
) {
  if (status === "cumplido") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "vigilar" || status === "sin_meta" || status === "sin_resultado") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-red-100 text-red-800 hover:bg-red-100";
}

function kpiStatusLabel(status: OfficialKpiRecord["status"]) {
  if (status === "CALCULABLE") {
    return "Calculable";
  }

  return "Pendiente";
}

function kpiStatusClass(status: OfficialKpiRecord["status"]) {
  if (status === "CALCULABLE") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  return "bg-amber-100 text-amber-800 hover:bg-amber-100";
}

function insightClass(severity: OfficialInsight["severity"]) {
  if (severity === "critica" || severity === "alta") {
    return "border-red-200 bg-red-50 text-red-950";
  }

  if (severity === "media") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-950";
}

function titleForMode(mode: OfficialDashboardMode): {
  icon: LucideIcon;
  subtitle: string;
  title: string;
} {
  const titles = {
    appointments: {
      icon: CalendarDays,
      subtitle: "Citas, no-show, cancelaciones y finalizacion desde cierres publicados.",
      title: "Citas y demanda",
    },
    branches: {
      icon: Building2,
      subtitle: "Sucursal por linea con KPIs oficiales, calidad y trazabilidad.",
      title: "Sucursales",
    },
    capacity: {
      icon: Gauge,
      subtitle: "Ocupacion, utilizacion, tiempos y capacidad desde cierres publicados.",
      title: "Capacidad",
    },
    finances: {
      icon: BarChart3,
      subtitle: "Finanzas consolidadas desde cierres publicados y KPIs calculados.",
      title: "Salud financiera",
    },
    imaging: {
      icon: Activity,
      subtitle: "KPIs publicados de Imagenes para el periodo y contexto autorizado.",
      title: "Imagenes",
    },
    insights: {
      icon: Lightbulb,
      subtitle: "Insights oficiales generados desde cierres publicados.",
      title: "Insights",
    },
    laboratory: {
      icon: Activity,
      subtitle: "KPIs publicados de Laboratorio para el periodo y contexto autorizado.",
      title: "Laboratorio",
    },
    managers: {
      icon: Users,
      subtitle: "Lectura gerencial oficial sin calcular bonos desde datos simulados.",
      title: "Gerentes",
    },
    operations: {
      icon: Activity,
      subtitle: "Actividad, flujo, capacidad y calidad desde cierres publicados.",
      title: "Operacion",
    },
    overview: {
      icon: BarChart3,
      subtitle: "Rendimiento operativo y financiero consolidado del periodo.",
      title: "Resumen Ejecutivo",
    },
    physiotherapy: {
      icon: Activity,
      subtitle: "KPIs publicados de Fisioterapia para el periodo y contexto autorizado.",
      title: "Fisioterapia",
    },
    professionals: {
      icon: Users,
      subtitle: "Productividad y rendimiento profesional desde KPIs publicados.",
      title: "Profesionales",
    },
    quality: {
      icon: ClipboardCheck,
      subtitle: "Completitud, campos faltantes y KPIs de calidad publicados.",
      title: "Calidad de datos",
    },
    services: {
      icon: CheckCircle2,
      subtitle: "Servicios, mezcla, productividad por unidad e ingresos unitarios.",
      title: "Servicios",
    },
    targets: {
      icon: Target,
      subtitle: "Metas aprobadas comparadas contra resultados publicados.",
      title: "Metas",
    },
  } satisfies Record<OfficialDashboardMode, {
    icon: LucideIcon;
    subtitle: string;
    title: string;
  }>;

  return titles[mode];
}

function selectKpisForMode(
  snapshot: OfficialExecutiveSnapshot,
  mode: OfficialDashboardMode,
) {
  if (lineModes.includes(mode)) {
    return snapshot.kpis;
  }

  const categories = kpiCategoriesByMode[mode];

  if (!categories) {
    return [];
  }

  const records = new Map<string, OfficialKpiRecord>();

  for (const category of categories) {
    for (const kpi of snapshot.kpiGroups[category]) {
      records.set(`${kpi.closingVersionId}:${kpi.kpiId}`, kpi);
    }
  }

  return [...records.values()];
}

function EmptyOrErrorState({ snapshot }: { snapshot: OfficialExecutiveSnapshot }) {
  const isError = snapshot.dataStatus === "configuration_error";

  return (
    <section className="rounded-md border border-dashed bg-card p-6 text-sm leading-6">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4 text-amber-600" />
        {isError ? "Lectura oficial no disponible" : "Sin cierres publicados"}
      </div>
      <p className="text-muted-foreground">
        {isError
          ? snapshot.errorMessage
          : "No hay cierres publicados no-demo para el contexto seleccionado. La plataforma no mostrara datos simulados como resultados reales."}
      </p>
    </section>
  );
}

function SummaryCards({ snapshot }: { snapshot: OfficialExecutiveSnapshot }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-md border bg-card p-4">
        <div className="text-sm text-muted-foreground">Cierres publicados</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">
          {snapshot.totals.publishedClosings}
        </div>
        <Badge className="mt-3 bg-slate-100 text-slate-800 hover:bg-slate-100">
          Periodo {snapshot.period ?? "pendiente"}
        </Badge>
      </article>
      <article className="rounded-md border bg-card p-4">
        <div className="text-sm text-muted-foreground">Resultado</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">
          {formatNumber(snapshot.totals.revenueActual, "currency")}
        </div>
        <Badge className="mt-3 bg-slate-100 text-slate-800 hover:bg-slate-100">
          Desde KPIs calculados
        </Badge>
      </article>
      <article className="rounded-md border bg-card p-4">
        <div className="text-sm text-muted-foreground">Completitud KPI</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">
          {formatPercent(snapshot.totals.dataCompleteness)}
        </div>
        <Badge className="mt-3 bg-slate-100 text-slate-800 hover:bg-slate-100">
          {snapshot.totals.calculableKpis}/{snapshot.totals.totalKpis} calculables
        </Badge>
      </article>
      <article className="rounded-md border bg-card p-4">
        <div className="text-sm text-muted-foreground">Meta aprobada</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">
          {formatNumber(snapshot.totals.revenueTarget, "currency")}
        </div>
        <Badge className="mt-3 bg-slate-100 text-slate-800 hover:bg-slate-100">
          {snapshot.totals.approvedTargets} comparaciones
        </Badge>
      </article>
    </section>
  );
}

function LineSummaryTable({ rows }: { rows: OfficialLineSummary[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <CheckCircle2 className="size-4 text-primary" />
        Lectura por linea de negocio
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Cierres</th>
              <th className="py-2 pr-4 font-medium">KPIs</th>
              <th className="py-2 pr-4 font-medium">Pendientes</th>
              <th className="py-2 pr-4 font-medium">Meta</th>
              <th className="py-2 pr-4 font-medium">Real</th>
              <th className="py-2 pr-4 font-medium">Cumplimiento</th>
              <th className="py-2 pr-4 font-medium">Calidad</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b last:border-b-0" key={row.businessLine}>
                <td className="py-3 pr-4 font-medium">{row.lineName}</td>
                <td className="py-3 pr-4">{row.publishedClosings}</td>
                <td className="py-3 pr-4">
                  {row.calculableKpis}/{row.totalKpis}
                </td>
                <td className="py-3 pr-4">{row.notCalculableKpis}</td>
                <td className="py-3 pr-4">
                  {formatNumber(row.revenueTarget, "currency")}
                </td>
                <td className="py-3 pr-4">
                  {formatNumber(row.revenueActual, "currency")}
                </td>
                <td className="py-3 pr-4">
                  {formatPercent(row.revenueCompliance)}
                </td>
                <td className="py-3 pr-4">{formatQuality(row.qualityScore)}</td>
                <td className="py-3 pr-4">
                  <Badge className={statusClass(row.status)}>
                    {statusLabel(row.status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BranchSummaryTable({ rows }: { rows: OfficialBranchSummary[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Building2 className="size-4 text-primary" />
        Lectura por sucursal
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">KPIs</th>
              <th className="py-2 pr-4 font-medium">Pendientes</th>
              <th className="py-2 pr-4 font-medium">Resultado</th>
              <th className="py-2 pr-4 font-medium">Actividad</th>
              <th className="py-2 pr-4 font-medium">Calidad</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                className="border-b last:border-b-0"
                key={`${row.businessLine}-${row.branchId}`}
              >
                <td className="py-3 pr-4 font-medium">{row.lineName}</td>
                <td className="py-3 pr-4">{row.branchName}</td>
                <td className="py-3 pr-4">
                  {row.calculableKpis}/{row.totalKpis}
                </td>
                <td className="py-3 pr-4">{row.notCalculableKpis}</td>
                <td className="py-3 pr-4">
                  {formatNumber(row.revenueActual, "currency")}
                </td>
                <td className="py-3 pr-4">
                  {formatNumber(row.activityVolume, "count")}
                </td>
                <td className="py-3 pr-4">{formatQuality(row.qualityScore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KpiTable({
  emptyMessage,
  rows,
  title,
}: {
  emptyMessage: string;
  rows: OfficialKpiRecord[];
  title: string;
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Activity className="size-4 text-primary" />
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Linea</th>
                <th className="py-2 pr-4 font-medium">Sucursal</th>
                <th className="py-2 pr-4 font-medium">Categoria</th>
                <th className="py-2 pr-4 font-medium">KPI</th>
                <th className="py-2 pr-4 font-medium">Valor</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Campos faltantes</th>
                <th className="py-2 pr-4 font-medium">Formula</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  className="border-b last:border-b-0"
                  key={`${row.closingVersionId}-${row.kpiId}`}
                >
                  <td className="py-3 pr-4 font-medium">{row.lineName}</td>
                  <td className="py-3 pr-4">{row.branchName}</td>
                  <td className="py-3 pr-4">{categoryLabels[row.primaryCategory]}</td>
                  <td className="py-3 pr-4">{row.kpiLabel}</td>
                  <td className="py-3 pr-4">{formatKpiValue(row)}</td>
                  <td className="py-3 pr-4">
                    <Badge className={kpiStatusClass(row.status)}>
                      {kpiStatusLabel(row.status)}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    {row.missingFields.length > 0
                      ? row.missingFields.join(", ")
                      : "Completo"}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {row.formula}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TargetTable({ rows }: { rows: OfficialTargetComparison[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Target className="size-4 text-primary" />
        Metas aprobadas vs resultados
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay metas aprobadas para este periodo y contexto.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Linea</th>
                <th className="py-2 pr-4 font-medium">Sucursal</th>
                <th className="py-2 pr-4 font-medium">KPI</th>
                <th className="py-2 pr-4 font-medium">Meta</th>
                <th className="py-2 pr-4 font-medium">Real</th>
                <th className="py-2 pr-4 font-medium">Variacion</th>
                <th className="py-2 pr-4 font-medium">Cumplimiento</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  className="border-b last:border-b-0"
                  key={`${row.businessLine}-${row.branchName}-${row.period}-${row.kpiId}`}
                >
                  <td className="py-3 pr-4 font-medium">{row.lineName}</td>
                  <td className="py-3 pr-4">{row.branchName}</td>
                  <td className="py-3 pr-4">{row.kpiLabel}</td>
                  <td className="py-3 pr-4">
                    {formatNumber(row.targetValue, row.unit)}
                  </td>
                  <td className="py-3 pr-4">
                    {formatNumber(row.actualValue, row.unit)}
                  </td>
                  <td className="py-3 pr-4">
                    {formatNumber(row.variance, row.unit)}
                  </td>
                  <td className="py-3 pr-4">{formatPercent(row.compliance)}</td>
                  <td className="py-3 pr-4">
                    <Badge className={statusClass(row.status)}>
                      {statusLabel(row.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DataQualityPanel({ snapshot }: { snapshot: OfficialExecutiveSnapshot }) {
  const missingFields = snapshot.dataQuality.missingFields.slice(0, 10);

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <article className="rounded-md border bg-card p-4">
        <div className="text-sm text-muted-foreground">Calidad promedio</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">
          {formatQuality(snapshot.dataQuality.averageScore)}
        </div>
        <Badge className="mt-3 bg-slate-100 text-slate-800 hover:bg-slate-100">
          {snapshot.dataQuality.publishedClosings} cierres
        </Badge>
      </article>
      <article className="rounded-md border bg-card p-4">
        <div className="text-sm text-muted-foreground">KPIs pendientes</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">
          {snapshot.dataQuality.notCalculableKpis}
        </div>
        <Badge className="mt-3 bg-slate-100 text-slate-800 hover:bg-slate-100">
          {snapshot.dataQuality.calculableKpis}/{snapshot.dataQuality.totalKpis} calculables
        </Badge>
      </article>
      <article className="rounded-md border bg-card p-4">
        <div className="text-sm text-muted-foreground">Campos faltantes</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">
          {snapshot.dataQuality.missingFieldCount}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {missingFields.length > 0 ? missingFields.join(", ") : "Sin faltantes"}
        </p>
      </article>
    </section>
  );
}

function InsightList({ insights }: { insights: OfficialInsight[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Lightbulb className="size-4 text-primary" />
        Insights oficiales
      </div>
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay insights oficiales para el periodo seleccionado.
        </p>
      ) : (
        <div className="grid gap-3">
          {insights.slice(0, 8).map((insight) => (
            <article
              className={cn("rounded-md border p-4", insightClass(insight.severity))}
              key={`${insight.businessLine}-${insight.branchName}-${insight.title}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{insight.lineName}</Badge>
                <Badge variant="outline">{insight.branchName}</Badge>
                <Badge variant="outline">{insight.severity}</Badge>
              </div>
              <h2 className="mt-3 text-base font-semibold tracking-normal">
                {insight.title}
              </h2>
              <p className="mt-2 text-sm leading-6">{insight.message}</p>
              <p className="mt-2 text-sm leading-6">
                <strong>Impacto:</strong> {insight.impact}
              </p>
              <p className="mt-1 text-sm leading-6">
                <strong>Accion sugerida:</strong> {insight.recommendedAction}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ContentForMode({
  mode,
  snapshot,
}: {
  mode: OfficialDashboardMode;
  snapshot: OfficialExecutiveSnapshot;
}) {
  const selectedKpis = selectKpisForMode(snapshot, mode);

  if (mode === "overview") {
    return (
      <>
        <LineSummaryTable rows={snapshot.lineSummaries} />
        <TargetTable rows={snapshot.targetComparisons} />
        <InsightList insights={snapshot.insights} />
      </>
    );
  }

  if (mode === "targets") {
    return <TargetTable rows={snapshot.targetComparisons} />;
  }

  if (mode === "insights") {
    return <InsightList insights={snapshot.insights} />;
  }

  if (mode === "branches") {
    return (
      <>
        <BranchSummaryTable rows={snapshot.branchSummaries} />
        <KpiTable
          emptyMessage="No hay KPIs oficiales publicados para las sucursales filtradas."
          rows={snapshot.kpis}
          title="KPIs oficiales por sucursal"
        />
      </>
    );
  }

  if (mode === "quality") {
    return (
      <>
        <DataQualityPanel snapshot={snapshot} />
        <KpiTable
          emptyMessage="No hay KPIs de calidad publicados para este contexto."
          rows={selectedKpis}
          title="KPIs y campos pendientes"
        />
      </>
    );
  }

  return (
    <>
      <KpiTable
        emptyMessage="No hay KPIs oficiales publicados para este modulo."
        rows={selectedKpis}
        title="KPIs oficiales del modulo"
      />
      {(mode === "finances" || mode === "managers" || lineModes.includes(mode)) && (
        <TargetTable rows={snapshot.targetComparisons} />
      )}
      {lineModes.includes(mode) && <InsightList insights={snapshot.insights} />}
    </>
  );
}

export function OfficialExecutiveDataDashboard({
  mode,
  snapshot,
}: OfficialExecutiveDataDashboardProps) {
  const title = titleForMode(mode);
  const Icon = title.icon;

  return (
    <section className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="w-fit bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            Datos oficiales
          </Badge>
          <Badge variant="outline">PostgreSQL RLS</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md border bg-card">
            <Icon className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              {title.title}
            </h1>
            <p className="text-sm text-muted-foreground">{title.subtitle}</p>
          </div>
        </div>
      </div>

      {snapshot.dataStatus !== "available" ? (
        <EmptyOrErrorState snapshot={snapshot} />
      ) : (
        <>
          <SummaryCards snapshot={snapshot} />
          <ContentForMode mode={mode} snapshot={snapshot} />
        </>
      )}

      <footer className="rounded-md border bg-card p-4 text-xs leading-5 text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <Database className="size-4 text-primary" />
          Fuente exacta
        </div>
        {snapshot.sourceTables.join(" -> ")}. Solo se muestran cierres
        publicados no-demo. Los KPIs no calculables se conservan como pendientes
        y no se interpretan como cero operativo.
      </footer>
    </section>
  );
}
