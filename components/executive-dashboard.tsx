"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Database,
  LineChart,
  Target,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  demoDashboardMeta,
  getAppointmentStatusByLine,
  getBusinessLinesForDashboard,
  getManagerPerformanceByLine,
  getOccupancyByLine,
  getRevenueShareData,
  getTargetVsActualByLine,
  insightPreviews,
  type BarPoint,
  type BusinessLineDashboard,
  type BusinessLineKey,
  type BusinessLineStatus,
} from "@/lib/analytics/demo-dashboard";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";

type StoredContext = {
  countryId?: string;
  countryName: string;
  companyId?: string;
  companyName: string;
  businessLineId?: string;
  businessLineName?: string;
  businessLineCode?: string;
  branchId?: string;
  branchName: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  isDemo: boolean;
};

function readStoredContext() {
  const rawContext =
    window.localStorage.getItem(storageKey) ??
    window.sessionStorage.getItem(storageKey);

  if (!rawContext) {
    return null;
  }

  try {
    return JSON.parse(rawContext) as StoredContext;
  } catch {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatCompactCurrency(value: number) {
  if (value >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString("en-US")}K`;
  }

  return formatCurrency(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value}%`;
}

function formatSignedPoints(value: number) {
  return `${value > 0 ? "+" : ""}${value} pts`;
}

function statusLabel(status: BusinessLineStatus) {
  if (status === "verde") {
    return "Verde";
  }

  if (status === "amarillo") {
    return "Amarillo";
  }

  return "Rojo";
}

function statusClass(status: BusinessLineStatus) {
  if (status === "verde") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "amarillo") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-red-100 text-red-800 hover:bg-red-100";
}

function getOperationalStatusTitle(line: BusinessLineDashboard | null) {
  if (line?.key === "laboratorio") {
    return "Ordenes y pacientes";
  }

  if (line?.key === "imagenes") {
    return "Estudios por estado";
  }

  return "Citas por estado";
}

function getOperationalSuccessLabel(line: BusinessLineDashboard) {
  if (line.key === "laboratorio") {
    return "Ordenes con paciente";
  }

  if (line.key === "imagenes") {
    return "Estudios realizados";
  }

  return "Exito de citas";
}

function getServiceVolumeLabel(line: BusinessLineDashboard) {
  if (line.key === "laboratorio") {
    return "Pruebas / ordenes";
  }

  if (line.key === "imagenes") {
    return "Estudios / informes";
  }

  return "Servicios / sesiones";
}

function BarList({
  data,
  suffix = "",
}: {
  data: BarPoint[];
  suffix?: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="grid gap-3">
      {data.map((item) => (
        <div className="grid gap-1" key={item.label}>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-muted-foreground">
              {item.label}
            </span>
            <span className="font-medium">
              {item.value.toLocaleString("en-US")}
              {suffix}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.max((item.value / maxValue) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExecutiveStatusTable({ lines }: { lines: BusinessLineDashboard[] }) {
  const orderedLines = [...lines].sort((firstLine, secondLine) => {
    const order: Record<BusinessLineKey, number> = {
      imagenes: 0,
      fisioterapia: 1,
      laboratorio: 2,
    };

    return order[firstLine.key] - order[secondLine.key];
  });

  return (
    <section className="grid gap-4 rounded-md border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-normal">
          Estado general de las lineas
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Lo primero que ve el CEO: comparacion por ingresos, crecimiento,
          margen, ocupacion, pacientes, ticket y estado.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Linea</th>
              <th className="py-2 pr-4 font-medium">Ingresos</th>
              <th className="py-2 pr-4 font-medium">Crecimiento</th>
              <th className="py-2 pr-4 font-medium">Margen</th>
              <th className="py-2 pr-4 font-medium">Ocupacion</th>
              <th className="py-2 pr-4 font-medium">Pacientes</th>
              <th className="py-2 pr-4 font-medium">Ticket</th>
              <th className="py-2 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orderedLines.map((line) => (
              <tr className="border-b last:border-b-0" key={line.key}>
                <td className="py-3 pr-4 font-medium">{line.shortName}</td>
                <td className="py-3 pr-4">{formatCompactCurrency(line.revenue)}</td>
                <td className="py-3 pr-4">
                  {formatSignedPercent(line.revenueGrowthRate)}
                </td>
                <td className="py-3 pr-4">
                  <div className="font-medium">{formatPercent(line.marginRate)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatSignedPoints(line.marginDeltaPoints)}
                  </div>
                </td>
                <td className="py-3 pr-4">{line.effectiveOccupancy}%</td>
                <td className="py-3 pr-4">
                  {line.patientCount.toLocaleString("en-US")}
                </td>
                <td className="py-3 pr-4">
                  {formatCurrency(line.averageTicket)}
                </td>
                <td className="py-3 pr-4">
                  <Badge className={statusClass(line.executiveStatus)}>
                    {statusLabel(line.executiveStatus)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2">
        {orderedLines.map((line) => (
          <p
            className="rounded-md bg-muted px-3 py-2 text-sm leading-6 text-muted-foreground"
            key={`${line.key}-interpretation`}
          >
            <span className="font-medium text-foreground">{line.shortName}: </span>
            {line.executiveInterpretation}
          </p>
        ))}
      </div>
    </section>
  );
}

function HealthBar({ label, value }: { label: string; value: number }) {
  const safeWidth = Math.max(0, Math.min(value, 100));

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${safeWidth}%` }} />
      </div>
    </div>
  );
}

function BusinessLineSummaryCard({ line }: { line: BusinessLineDashboard }) {
  const goalCompletion = line.revenue / line.revenueTarget;
  const operationalSuccess =
    line.scheduledAppointments > 0
      ? line.completedAppointments / line.scheduledAppointments
      : 0;

  return (
    <article className="grid min-h-72 gap-4 rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{line.companyName}</h2>
          <p className="text-xs text-muted-foreground">{line.scopeName}</p>
        </div>
        <Badge variant="outline">{line.sourceNote}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Venta</div>
          <div className="text-2xl font-semibold tracking-normal">
            {formatCompactCurrency(line.revenue)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Meta</div>
          <div className="text-2xl font-semibold tracking-normal">
            {formatCompactCurrency(line.revenueTarget)}
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <HealthBar label="Cumplimiento meta" value={Math.round(goalCompletion * 100)} />
        <HealthBar label="Salud operativa" value={line.operatingHealth} />
        <HealthBar label="Ocupacion efectiva" value={line.effectiveOccupancy} />
      </div>

      <div className="grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>Margen</span>
          <span className="font-medium text-foreground">
            {formatPercent(line.marginRate)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{getOperationalSuccessLabel(line)}</span>
          <span className="font-medium text-foreground">
            {formatPercent(operationalSuccess)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{getServiceVolumeLabel(line)}</span>
          <span className="font-medium text-foreground">
            {line.serviceVolume.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      <p className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
        {line.alert}
      </p>
    </article>
  );
}

function BusinessLineSummary({ lines }: { lines: BusinessLineDashboard[] }) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-normal">
          1. Resumen por linea de negocio
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Sin total mezclado: cada linea mantiene su venta, meta, margen, citas
          y ocupacion para no leer una suma que no representa la realidad.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {lines.map((line) => (
          <BusinessLineSummaryCard key={`${line.key}-${line.scopeName}`} line={line} />
        ))}
      </div>
    </section>
  );
}

function FinancialHealthByLine({ lines }: { lines: BusinessLineDashboard[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <CircleDollarSign className="size-4 text-primary" />
        Salud financiera de las lineas del negocio
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {lines.map((line) => (
          <article className="grid gap-3 rounded-md border p-3" key={line.companyName}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{line.shortName}</h3>
                <p className="text-xs text-muted-foreground">{line.scopeName}</p>
              </div>
              <Badge
                className={cn(
                  line.financialHealth >= 85 &&
                    "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
                  line.financialHealth < 85 &&
                    "bg-amber-100 text-amber-800 hover:bg-amber-100",
                )}
              >
                {line.financialHealth}%
              </Badge>
            </div>
            <HealthBar label="Salud financiera" value={line.financialHealth} />
            <dl className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <dt>Ingresos cobrados</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.collectedRevenue)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Cuentas por cobrar</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.accountsReceivable)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Gastos fijos</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.fixedExpenses)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Gastos variables</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.variableExpenses)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Costos fijos</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.fixedCosts)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Costos variables</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactCurrency(line.variableCosts)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function MonthlyRevenueByLine({ lines }: { lines: BusinessLineDashboard[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <TrendingUp className="size-4 text-primary" />
        Ingresos por mes
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {lines.map((line) => (
          <article className="grid gap-3" key={line.companyName}>
            <div>
              <h3 className="text-sm font-semibold">{line.shortName}</h3>
              <p className="text-xs text-muted-foreground">{line.scopeName}</p>
            </div>
            <BarList data={line.monthlyRevenue} suffix="K" />
          </article>
        ))}
      </div>
    </section>
  );
}

function OperationalLineSelector({
  lines,
  selectedLineKey,
  onSelectedLineKeyChange,
}: {
  lines: BusinessLineDashboard[];
  selectedLineKey: BusinessLineKey | "";
  onSelectedLineKeyChange: (lineKey: BusinessLineKey) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold tracking-normal">
          Detalle operativo por linea de negocio
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Elige la linea para ver citas por estado, ocupacion efectiva y
          rendimiento sin mezclar negocios.
        </p>
      </div>
      <label className="grid min-w-64 gap-1 text-sm">
        <span className="font-medium">Linea de negocio</span>
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) =>
            onSelectedLineKeyChange(event.target.value as BusinessLineKey)
          }
          value={selectedLineKey}
        >
          {lines.map((line) => (
            <option key={line.key} value={line.key}>
              {line.companyName}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function ExecutiveDashboard() {
  const [context, setContext] = useState<StoredContext | null>(null);
  const [selectedOperationalLineKey, setSelectedOperationalLineKey] =
    useState<BusinessLineKey | "">("");

  useEffect(() => {
    function refreshContext() {
      setContext(readStoredContext());
    }

    refreshContext();
    window.addEventListener("storage", refreshContext);
    window.addEventListener(contextChangeEvent, refreshContext);

    return () => {
      window.removeEventListener("storage", refreshContext);
      window.removeEventListener(contextChangeEvent, refreshContext);
    };
  }, []);

  const selectedPeriod =
    context?.period ??
    (context?.periodStart && context?.periodEnd
      ? `${context.periodStart} a ${context.periodEnd}`
      : demoDashboardMeta.selectedPeriod);

  const lines = useMemo(
    () =>
      getBusinessLinesForDashboard({
        branchId: context?.branchId,
        companyName: context?.companyName,
      }),
    [context?.branchId, context?.companyName],
  );

  const revenueShare = useMemo(() => getRevenueShareData(lines), [lines]);
  const targetVsActual = useMemo(() => getTargetVsActualByLine(lines), [lines]);
  const selectedOperationalLine = useMemo(
    () =>
      lines.find((line) => line.key === selectedOperationalLineKey) ??
      lines[0] ??
      null,
    [lines, selectedOperationalLineKey],
  );
  const operationalLines = useMemo(
    () => (selectedOperationalLine ? [selectedOperationalLine] : []),
    [selectedOperationalLine],
  );
  const appointmentStatus = useMemo(
    () => getAppointmentStatusByLine(operationalLines),
    [operationalLines],
  );
  const selectedOccupancy = useMemo(
    () => getOccupancyByLine(operationalLines),
    [operationalLines],
  );
  const managerPerformance = useMemo(
    () => getManagerPerformanceByLine(operationalLines),
    [operationalLines],
  );

  useEffect(() => {
    if (lines.length === 0) {
      setSelectedOperationalLineKey("");
      return;
    }

    if (!lines.some((line) => line.key === selectedOperationalLineKey)) {
      setSelectedOperationalLineKey(lines[0].key);
    }
  }, [lines, selectedOperationalLineKey]);

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            Entorno DEMO
          </Badge>
          <Badge variant="outline">Completitud {demoDashboardMeta.completeness}%</Badge>
          <Badge variant="outline">{demoDashboardMeta.dataCoverage}</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              Resumen ejecutivo
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Vista ejecutiva DEMO para CEO, gerente de operaciones y gerentes
              de sucursal. El primer bloque esta separado por linea de negocio;
              no usa una suma general porque eso puede ocultar la realidad de
              cada empresa.
            </p>
          </div>
          <div className="rounded-md border bg-card p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4 text-primary" />
              Vista ejecutiva activa
            </div>
            <div className="grid gap-1 text-muted-foreground">
              <span>
                {context?.countryName ?? "Pais pendiente"} /{" "}
                {context?.companyName ?? "Empresa pendiente"} /{" "}
                {context?.businessLineName ?? "Linea pendiente"}
              </span>
              <span>{context?.branchName ?? "Sucursal pendiente"}</span>
              <span>Periodo: {selectedPeriod}</span>
              <span>Ultima actualizacion: {demoDashboardMeta.lastUpdated}</span>
            </div>
          </div>
        </div>
      </div>

      <ExecutiveStatusTable lines={lines} />
      <BusinessLineSummary lines={lines} />
      <FinancialHealthByLine lines={lines} />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-md border bg-card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="size-4 text-primary" />
            Participacion por empresa
          </div>
          <BarList data={revenueShare} suffix="%" />
        </section>

        <section className="rounded-md border bg-card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Target className="size-4 text-primary" />
            Metas vs resultados por empresa
          </div>
          <BarList data={targetVsActual} suffix="K" />
        </section>
      </div>

      <MonthlyRevenueByLine lines={lines} />

      <OperationalLineSelector
        lines={lines}
        onSelectedLineKeyChange={setSelectedOperationalLineKey}
        selectedLineKey={selectedOperationalLine?.key ?? ""}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-md border bg-card p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LineChart className="size-4 text-primary" />
              {getOperationalStatusTitle(selectedOperationalLine)}
            </div>
            {selectedOperationalLine ? (
              <Badge variant="outline">{selectedOperationalLine.shortName}</Badge>
            ) : null}
          </div>
          <BarList data={appointmentStatus} />
        </section>

        <section className="rounded-md border bg-card p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="size-4 text-primary" />
              Ocupacion efectiva
            </div>
            {selectedOperationalLine ? (
              <Badge variant="outline">{selectedOperationalLine.shortName}</Badge>
            ) : null}
          </div>
          <BarList data={selectedOccupancy} suffix="%" />
        </section>

        <section className="rounded-md border bg-card p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4 text-primary" />
              Rendimiento de la linea seleccionada
            </div>
            {selectedOperationalLine ? (
              <Badge variant="outline">{selectedOperationalLine.shortName}</Badge>
            ) : null}
          </div>
          <BarList data={managerPerformance} suffix="%" />
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Cambia con el selector superior de negocio, sucursal y fechas, y
            con el selector de linea de negocio de este bloque.
          </p>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="rounded-md border bg-card p-4">
          <div className="mb-4 text-sm font-medium">Insights DEMO</div>
          <div className="grid gap-3">
            {insightPreviews.map((insight) => (
              <article
                className="grid gap-2 border-t py-3 first:border-t-0 first:pt-0 last:pb-0"
                key={insight.title}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn(
                      insight.priority === "alta" &&
                        "bg-red-100 text-red-800 hover:bg-red-100",
                      insight.priority === "media" &&
                        "bg-amber-100 text-amber-800 hover:bg-amber-100",
                      insight.priority === "baja" &&
                        "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
                    )}
                  >
                    {insight.priority}
                  </Badge>
                  <span className="text-sm font-medium">{insight.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Indicador: {insight.affectedIndicator}
                </p>
                <p className="text-sm text-muted-foreground">
                  {insight.recommendation}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-md border bg-card p-4">
          <div className="mb-4 text-sm font-medium">Fuentes utilizadas</div>
          <ul className="grid gap-3 text-sm text-muted-foreground">
            {demoDashboardMeta.sources.map((source) => (
              <li className="flex items-center gap-2" key={source}>
                <CheckCircle2 className="size-4 text-emerald-600" />
                {source}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            Las metricas son DEMO. No usar como informacion operativa,
            financiera o clinica real.
          </div>
        </section>
      </div>
    </section>
  );
}
