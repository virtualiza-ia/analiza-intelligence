"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Filter,
  GitBranch,
  LineChart,
  Scale,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { AnalyticsComparisonChart } from "@/components/analytics-comparison-chart";
import { ReadableTabs } from "@/components/readable-tabs";
import { Badge } from "@/components/ui/badge";
import {
  resolveBusinessLineSlug,
  type BusinessLineSlug,
} from "@/lib/analytics/business-line-operations";
import {
  buildManagerBonusTrendChart,
  getManagerBonusScreen,
  type BonusState,
  type ManagerBonusMetric,
  type ManagerBonusRecord,
  type ManagerBonusStatus,
} from "@/lib/analytics/manager-bonuses";
import {
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";
import { cn } from "@/lib/utils";

const storageKey = "analiza:selected-context";
const contextChangeEvent = "analiza:context-change";
const allOption = "Todos";

type StoredContext = {
  countryName?: string;
  companyName?: string;
  businessLineId?: string;
  businessLineName?: string;
  branchName?: string;
  managerName?: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  isDemo?: boolean;
};

type ManagerFilters = {
  bonusState: string;
  goalType: string;
  managerType: string;
  status: string;
};

type SortKey =
  | "score"
  | "targetCompletionRate"
  | "netSales"
  | "utility"
  | "occupancyRate"
  | "dataQuality"
  | "bonusProjected"
  | "blockers";

function readStoredContext() {
  if (typeof window === "undefined") {
    return null;
  }

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

function resolveContextLine(context: StoredContext | null): BusinessLineSlug {
  return resolveBusinessLineSlug({
    businessLineId: context?.businessLineId,
    businessLineName: context?.businessLineName,
    companyName: context?.companyName,
  });
}

function formatPeriod(context: StoredContext | null) {
  if (context?.period) {
    return context.period;
  }

  if (context?.periodStart && context?.periodEnd) {
    return `${context.periodStart} a ${context.periodEnd}`;
  }

  return "Rango pendiente";
}

function createDefaultFilters(): ManagerFilters {
  return {
    bonusState: allOption,
    goalType: allOption,
    managerType: allOption,
    status: allOption,
  };
}

function uniqueOptions<T extends string>(records: T[]) {
  return [allOption, ...Array.from(new Set(records)).sort()];
}

function toneClass(tone: ManagerBonusMetric["tone"]) {
  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (tone === "negative") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  return "border-border bg-card text-foreground";
}

function statusClass(status: ManagerBonusStatus) {
  if (status === "Sobresaliente" || status === "Saludable") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "Precaucion") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  if (status === "Critico") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

function bonusStateClass(state: BonusState) {
  if (state === "Aprobado" || state === "Pagado") {
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (state === "Bloqueado") {
    return "bg-red-100 text-red-800 hover:bg-red-100";
  }

  if (
    state === "Retenido" ||
    state === "Observado" ||
    state === "Pendiente de datos"
  ) {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }

  return "bg-blue-100 text-blue-800 hover:bg-blue-100";
}

function ProgressBar({
  color = "bg-primary",
  value,
}: {
  color?: string;
  value: number;
}) {
  return (
    <div className="h-2 rounded-full bg-muted">
      <div
        className={cn("h-2 rounded-full", color)}
        style={{ width: `${Math.max(4, Math.min(value, 100))}%` }}
      />
    </div>
  );
}

function ChartExplanation({
  items,
}: {
  items: { color?: string; label: string; text: string }[];
}) {
  return (
    <div className="mt-4 grid gap-2 rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
      <div className="font-medium text-foreground sm:col-span-2">
        Como leer esta grafica
      </div>
      {items.map((item) => (
        <div className="flex items-start gap-2" key={item.label}>
          <span
            className={cn(
              "mt-1 size-2.5 shrink-0 rounded-full bg-slate-500",
              item.color,
            )}
          />
          <span>
            <span className="font-medium text-foreground">{item.label}: </span>
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScopeCard({
  context,
  lineSlug,
}: {
  context: StoredContext | null;
  lineSlug: BusinessLineSlug;
}) {
  return (
    <aside className="rounded-md border bg-card p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-4 text-primary" />
        Pantalla de gerentes y bonos activa
      </div>
      <div className="grid gap-1 text-muted-foreground">
        <span>{context?.countryName ?? "Vista regional"}</span>
        <span>{context?.businessLineName ?? context?.companyName ?? "Consolidado"}</span>
        <span>{context?.branchName ?? "Todas las sucursales"}</span>
        <span>{context?.managerName ?? "Todos los gerentes"}</span>
        <span>Linea: {lineSlug}</span>
        <span>Periodo: {formatPeriod(context)}</span>
      </div>
    </aside>
  );
}

function ManagerFiltersPanel({
  filters,
  onChange,
  records,
}: {
  filters: ManagerFilters;
  onChange: (filters: ManagerFilters) => void;
  records: ManagerBonusRecord[];
}) {
  function updateField(key: keyof ManagerFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const fields: {
    key: keyof ManagerFilters;
    label: string;
    options: string[];
  }[] = [
    {
      key: "bonusState",
      label: "Estado del bono",
      options: uniqueOptions(records.map((record) => record.bonusState)),
    },
    {
      key: "goalType",
      label: "Tipo de meta",
      options: uniqueOptions(records.map((record) => record.goalType)),
    },
    {
      key: "managerType",
      label: "Tipo de gerente",
      options: uniqueOptions(records.map((record) => record.managerType)),
    },
    {
      key: "status",
      label: "Estado del score",
      options: uniqueOptions(records.map((record) => record.status)),
    },
  ];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Filter className="size-4 text-primary" />
        Filtros de gerentes y bonos
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {fields.map((field) => (
          <label className="grid gap-1 text-xs" key={field.key}>
            <span className="font-medium text-muted-foreground">
              {field.label}
            </span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => updateField(field.key, event.target.value)}
              value={filters[field.key]}
            >
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

function GroupedMetrics({ metrics }: { metrics: ManagerBonusMetric[] }) {
  const groups: ManagerBonusMetric["group"][] = ["Gerentes", "Bonos", "Gestion"];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {groups.map((group) => (
        <section className="rounded-md border bg-card p-4" key={group}>
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            {group === "Gerentes" ? (
              <UsersRound className="size-4 text-primary" />
            ) : group === "Bonos" ? (
              <BadgeDollarSign className="size-4 text-primary" />
            ) : (
              <Target className="size-4 text-primary" />
            )}
            {group}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {metrics
              .filter((metric) => metric.group === group)
              .slice(0, 8)
              .map((metric) => (
                <article
                  className={cn("grid min-h-28 gap-2 rounded-md border p-3", toneClass(metric.tone))}
                  key={`${metric.group}-${metric.label}`}
                >
                  <div className="text-xs font-medium opacity-90">
                    {metric.label}
                  </div>
                  <div className="text-xl font-semibold tracking-normal">
                    {metric.value}
                  </div>
                  <p className="text-xs leading-5 opacity-90">{metric.note}</p>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function WeightModel({
  weights,
}: {
  weights: { dimension: string; weight: number }[];
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <Scale className="size-4 text-primary" />
        Ponderacion configurable del score
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {weights.map((weight) => (
          <article className="rounded-md border bg-background p-3" key={weight.dimension}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{weight.dimension}</span>
              <span className="text-muted-foreground">{weight.weight}%</span>
            </div>
            <ProgressBar value={weight.weight * 3.3} />
          </article>
        ))}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-blue-600",
            label: "Barra",
            text: "peso que tiene esa dimension dentro del score total.",
          },
          {
            color: "bg-slate-500",
            label: "Porcentaje",
            text: "cuanto influye esa dimension al calcular el bono.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "permite ajustar la ponderacion por empresa, linea de negocio o tipo de sucursal.",
          },
        ]}
      />
    </section>
  );
}

function findDimensionScore(record: ManagerBonusRecord, pattern: RegExp) {
  return record.dimensions.find((dimension) => pattern.test(dimension.label))?.score;
}

function ExecutiveManagerPerformanceTable({
  records,
}: {
  records: ManagerBonusRecord[];
}) {
  if (records.length === 0) {
    return (
      <section className="rounded-md border bg-card p-6 text-sm leading-6 text-muted-foreground">
        No hay gerentes para estos filtros. Ajusta estado, tipo de meta o
        alcance del contexto superior.
      </section>
    );
  }

  const rows = records.map((record) => ({
    ...record,
    productivity:
      findDimensionScore(record, /productividad|operacion|produccion/i) ??
      record.score,
  }));

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GitBranch className="size-4 text-primary" />
          Rendimiento ejecutivo de gerentes
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Respeta jerarquia Gerente Operaciones {"->"} Gerente Area {"->"}{" "}
          Gerente Sucursal. No rankea solo por ingresos absolutos; separa
          componentes para evitar un score opaco.
        </p>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((record) => (
          <article
            className="grid gap-3 rounded-md border bg-background p-3 text-sm"
            key={`${record.id}-executive-mobile`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{record.manager}</div>
                <div className="text-xs text-muted-foreground">
                  {record.region} · {record.branch}
                </div>
              </div>
              <Badge className={statusClass(record.status)}>
                {record.status}
              </Badge>
            </div>
            <dl className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <dt>Ingresos vs meta</dt>
                <dd>
                  {formatCurrency(record.netSales)} /{" "}
                  {formatRate(record.targetCompletionRate)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Ocupacion efectiva</dt>
                <dd>{formatRate(record.occupancyRate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Finalizacion/SLA</dt>
                <dd>{formatRate(record.slaRate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>No-show</dt>
                <dd>No calculable sin agenda por gerente</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Productividad</dt>
                <dd>{record.productivity}/100</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Margen</dt>
                <dd>{formatRate(record.marginRate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Calidad</dt>
                <dd>{record.dataQuality}/100</dd>
              </div>
            </dl>
            <p className="rounded-md bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
              {record.blockingConditions[0]?.reason ?? record.principalGap}
            </p>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Gerente</th>
              <th className="py-2 pr-4 font-medium">Area</th>
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">Ingresos vs meta</th>
              <th className="py-2 pr-4 font-medium">Ocupacion efectiva</th>
              <th className="py-2 pr-4 font-medium">Finalizacion/SLA</th>
              <th className="py-2 pr-4 font-medium">No-show</th>
              <th className="py-2 pr-4 font-medium">Productividad</th>
              <th className="py-2 pr-4 font-medium">Margen</th>
              <th className="py-2 pr-4 font-medium">Calidad</th>
              <th className="py-2 pr-4 font-medium">Alertas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr className="border-b last:border-b-0" key={`${record.id}-executive`}>
                <td className="py-3 pr-4 font-medium">{record.manager}</td>
                <td className="py-3 pr-4">{record.region}</td>
                <td className="py-3 pr-4">{record.branch}</td>
                <td className="py-3 pr-4">
                  <div>{formatCurrency(record.netSales)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatRate(record.targetCompletionRate)}
                  </div>
                </td>
                <td className="py-3 pr-4">{formatRate(record.occupancyRate)}</td>
                <td className="py-3 pr-4">{formatRate(record.slaRate)}</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  No calculable sin agenda por gerente
                </td>
                <td className="py-3 pr-4">{record.productivity}/100</td>
                <td className="py-3 pr-4">{formatRate(record.marginRate)}</td>
                <td className="py-3 pr-4">
                  {record.dataQuality}/100
                  {record.dataQuality < 72 ? (
                    <div className="text-xs text-amber-700">
                      Score ejecutivo no concluyente
                    </div>
                  ) : null}
                </td>
                <td className="max-w-[280px] py-3 pr-4 text-muted-foreground">
                  {record.blockingConditions[0]?.reason ?? record.principalGap}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ManagerRankingTable({
  onSelect,
  records,
  selectedId,
}: {
  onSelect: (id: string) => void;
  records: ManagerBonusRecord[];
  selectedId: string | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const aValue = sortKey === "blockers" ? a.blockingConditions.length : Number(a[sortKey]);
      const bValue = sortKey === "blockers" ? b.blockingConditions.length : Number(b[sortKey]);
      return direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [direction, records, sortKey]);

  function sortBy(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setDirection("desc");
  }

  const columns: {
    key: SortKey;
    label: string;
    render: (record: ManagerBonusRecord) => string;
  }[] = [
    { key: "score", label: "Score", render: (record) => `${record.score}` },
    {
      key: "targetCompletionRate",
      label: "Cumplimiento",
      render: (record) => formatRate(record.targetCompletionRate),
    },
    { key: "netSales", label: "Venta", render: (record) => formatCurrency(record.netSales) },
    { key: "utility", label: "Utilidad", render: (record) => formatCurrency(record.utility) },
    {
      key: "occupancyRate",
      label: "Ocupacion",
      render: (record) => formatRate(record.occupancyRate),
    },
    { key: "dataQuality", label: "Datos", render: (record) => `${record.dataQuality}` },
    {
      key: "bonusProjected",
      label: "Bono",
      render: (record) => formatCurrency(record.bonusProjected),
    },
    {
      key: "blockers",
      label: "Bloqueos",
      render: (record) => `${record.blockingConditions.length}`,
    },
  ];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium">
        <BarChart3 className="size-4 text-primary" />
        Ranking de gerentes: resultado, gestion y bono
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Gerente</th>
              <th className="py-2 pr-4 font-medium">Sucursal</th>
              <th className="py-2 pr-4 font-medium">Linea</th>
              {columns.map((column) => (
                <th className="py-2 pr-4 font-medium" key={column.key}>
                  <button
                    className="rounded-md px-1 py-0.5 hover:bg-muted"
                    onClick={() => sortBy(column.key)}
                    type="button"
                  >
                    {column.label}
                  </button>
                </th>
              ))}
              <th className="py-2 pr-4 font-medium">Estado</th>
              <th className="py-2 pr-4 font-medium">Bono</th>
              <th className="py-2 pr-4 font-medium">Decision</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => (
              <tr
                className={cn(
                  "cursor-pointer border-b last:border-b-0 hover:bg-muted/50",
                  selectedId === record.id ? "bg-muted" : "",
                )}
                key={record.id}
                onClick={() => onSelect(record.id)}
              >
                <td className="py-3 pr-4 font-medium">{record.manager}</td>
                <td className="py-3 pr-4">
                  <div>{record.branch}</div>
                  <div className="text-xs text-muted-foreground">
                    {record.managerType}
                  </div>
                </td>
                <td className="py-3 pr-4">{record.line}</td>
                {columns.map((column) => (
                  <td className="py-3 pr-4" key={`${record.id}-${column.key}`}>
                    {column.render(record)}
                  </td>
                ))}
                <td className="py-3 pr-4">
                  <Badge className={statusClass(record.status)}>
                    {record.status}
                  </Badge>
                </td>
                <td className="py-3 pr-4">
                  <Badge className={bonusStateClass(record.bonusState)}>
                    {record.bonusState}
                  </Badge>
                </td>
                <td className="max-w-[260px] py-3 pr-4 text-muted-foreground">
                  {record.recommendedAction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScoreDimensionBars({ record }: { record: ManagerBonusRecord }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Target className="size-4 text-primary" />
          Score por dimension
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {record.explanation}
        </p>
      </div>
      <div className="grid gap-3">
        {record.dimensions.map((dimension) => (
          <div className="grid gap-1" key={dimension.id}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{dimension.label}</span>
              <span className="text-muted-foreground">
                {dimension.score} / peso {dimension.weight}% / {dimension.points} pts
              </span>
            </div>
            <ProgressBar
              color={
                dimension.score >= 85
                  ? "bg-emerald-600"
                  : dimension.score >= 72
                    ? "bg-amber-500"
                    : "bg-red-600"
              }
              value={dimension.score}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              {dimension.insight}
            </p>
          </div>
        ))}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-slate-500",
            label: "Cada fila",
            text: "es una dimension del score del gerente, como finanzas, operacion, calidad o datos.",
          },
          {
            color: "bg-slate-500",
            label: "Barra",
            text: "muestra el resultado de esa dimension en una escala de 0 a 100.",
          },
          {
            color: "bg-emerald-600",
            label: "Verde",
            text: "dimension saludable; amarillo indica precaucion y rojo indica riesgo.",
          },
          {
            color: "bg-blue-600",
            label: "Puntos",
            text: "son el aporte ponderado de esa dimension al score total.",
          },
        ]}
      />
    </section>
  );
}

function ComplianceBonusChart({ records }: { records: ManagerBonusRecord[] }) {
  const chartRecords = records.slice(0, 8);
  const width = 760;
  const height = 260;
  const padding = { bottom: 54, left: 48, right: 56, top: 20 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxBonus = Math.max(...chartRecords.map((record) => record.bonusProjected), 1);
  const bonusCeiling = Math.ceil(maxBonus / 100) * 100;
  const bonusTicks = [0, bonusCeiling * 0.5, bonusCeiling];
  const yMax = 120;

  function yScale(value: number) {
    return padding.top + (1 - value / yMax) * plotHeight;
  }

  function bonusY(value: number) {
    return padding.top + (1 - value / bonusCeiling) * plotHeight;
  }

  const linePoints = chartRecords
    .map((record, index) => {
      const x = padding.left + (index + 0.5) * (plotWidth / Math.max(chartRecords.length, 1));
      return `${x.toFixed(2)},${bonusY(record.bonusProjected).toFixed(2)}`;
    })
    .join(" ");

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LineChart className="size-4 text-primary" />
          Cumplimiento versus bono proyectado
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Barras: cumplimiento de meta. Linea: bono proyectado. La linea punteada
          marca 100% de meta.
        </p>
      </div>
      <div className="overflow-x-auto">
        <svg
          aria-label="Cumplimiento versus bono proyectado"
          className="h-80 min-w-[760px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 50, 100, 120].map((tick) => (
            <g key={tick}>
              <line
                stroke="#e2e8f0"
                strokeDasharray={tick === 100 ? "5 5" : "4 4"}
                x1={padding.left}
                x2={width - padding.right}
                y1={yScale(tick)}
                y2={yScale(tick)}
              />
              <text fill="#64748b" fontSize="11" textAnchor="end" x={padding.left - 8} y={yScale(tick) + 4}>
                {tick}%
              </text>
            </g>
          ))}
          {bonusTicks.map((tick) => (
            <text
              fill="#2563eb"
              fontSize="11"
              key={`bonus-${tick}`}
              textAnchor="start"
              x={width - padding.right + 8}
              y={bonusY(tick) + 4}
            >
              {formatCurrency(tick)}
            </text>
          ))}
          <line
            stroke="#2563eb"
            strokeDasharray="3 4"
            x1={width - padding.right}
            x2={width - padding.right}
            y1={padding.top}
            y2={height - padding.bottom}
          />

          {chartRecords.map((record, index) => {
            const band = plotWidth / Math.max(chartRecords.length, 1);
            const barWidth = Math.max(28, band * 0.5);
            const x = padding.left + index * band + (band - barWidth) / 2;
            const barHeight = yScale(0) - yScale(record.targetCompletionRate * 100);
            return (
              <g key={record.id}>
                <rect
                  fill={record.targetCompletionRate >= 1 ? "#16a34a" : "#f59e0b"}
                  height={Math.max(2, barHeight)}
                  rx="4"
                  width={barWidth}
                  x={x}
                  y={yScale(record.targetCompletionRate * 100)}
                >
                  <title>{`${record.manager}
Cumplimiento: ${formatRate(record.targetCompletionRate)}
Bono proyectado: ${formatCurrency(record.bonusProjected)}
Estado: ${record.bonusState}`}</title>
                </rect>
                <text fill="#64748b" fontSize="10" textAnchor="middle" x={x + barWidth / 2} y={height - 18}>
                  {record.manager.split(" ")[0]}
                </text>
              </g>
            );
          })}

          <polyline
            fill="none"
            points={linePoints}
            stroke="#2563eb"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          {chartRecords.map((record, index) => {
            const x = padding.left + (index + 0.5) * (plotWidth / Math.max(chartRecords.length, 1));
            const y = bonusY(record.bonusProjected);
            return (
              <circle cx={x} cy={y} fill="#2563eb" key={`${record.id}-bonus`} r="5">
                <title>{`${record.manager}: ${formatCurrency(record.bonusProjected)}`}</title>
              </circle>
            );
          })}

          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={padding.left + plotWidth / 2} y={height - 2}>
            Gerentes
          </text>
          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={width - 24} y={padding.top + 10}>
            Bono USD
          </text>
        </svg>
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-slate-500",
            label: "Eje X",
            text: "cada nombre abajo es un gerente.",
          },
          {
            color: "bg-slate-500",
            label: "Eje Y izquierdo",
            text: "porcentaje de cumplimiento de meta; las barras usan esta escala.",
          },
          {
            color: "bg-blue-600",
            label: "Linea azul",
            text: "bono proyectado en dolares; se lee con el eje derecho azul, no con el porcentaje.",
          },
          {
            color: "bg-emerald-600",
            label: "Barras verdes",
            text: "gerentes que llegaron o superaron 100% de meta.",
          },
          {
            color: "bg-amber-500",
            label: "Barras naranjas",
            text: "gerentes por debajo de 100% de meta.",
          },
          {
            color: "bg-slate-400",
            label: "Linea punteada",
            text: "referencia de 100% de meta.",
          },
        ]}
      />
    </section>
  );
}

function ProfitabilityPerformanceMatrix({
  onSelect,
  records,
}: {
  onSelect: (id: string) => void;
  records: ManagerBonusRecord[];
}) {
  const chartRecords = records.slice(0, 10);
  const width = 720;
  const height = 360;
  const padding = { bottom: 66, left: 76, right: 56, top: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xMin = 55;
  const xMax = 100;
  const xThreshold = 80;
  const maxUtility = Math.max(...chartRecords.map((record) => record.utility), 16000);
  const yMax = Math.ceil((maxUtility * 1.12) / 5000) * 5000;
  const yThreshold = yMax * 0.55;

  function xScale(value: number) {
    return padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  }

  function yScale(value: number) {
    return padding.top + (1 - value / yMax) * plotHeight;
  }

  const xTicks = [60, 70, 80, 90, 100];
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Scale className="size-4 text-primary" />
          Rentabilidad versus desempeno gerencial
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Eje X: score gerencial. Eje Y: utilidad operativa. Tamano: venta.
          Pasa encima para ver datos exactos.
        </p>
      </div>
      <div className="overflow-hidden rounded-md border bg-background p-2">
        <svg
          aria-label="Matriz de rentabilidad versus desempeno gerencial"
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <rect fill="#f8fafc" height={plotHeight} width={plotWidth} x={padding.left} y={padding.top} />
          <rect fill="#ecfdf5" height={yScale(yThreshold) - padding.top} opacity="0.7" width={width - padding.right - xScale(xThreshold)} x={xScale(xThreshold)} y={padding.top} />
          <rect fill="#fff7ed" height={plotHeight - (yScale(yThreshold) - padding.top)} opacity="0.62" width={width - padding.right - xScale(xThreshold)} x={xScale(xThreshold)} y={yScale(yThreshold)} />
          <rect fill="#fef2f2" height={plotHeight - (yScale(yThreshold) - padding.top)} opacity="0.58" width={xScale(xThreshold) - padding.left} x={padding.left} y={yScale(yThreshold)} />
          <rect fill="#eff6ff" height={yScale(yThreshold) - padding.top} opacity="0.55" width={xScale(xThreshold) - padding.left} x={padding.left} y={padding.top} />

          {xTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line stroke="#cbd5e1" strokeDasharray="4 4" x1={xScale(tick)} x2={xScale(tick)} y1={padding.top} y2={height - padding.bottom} />
              <text fill="#64748b" fontSize="11" textAnchor="middle" x={xScale(tick)} y={height - 28}>
                {tick}
              </text>
            </g>
          ))}
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line stroke="#cbd5e1" strokeDasharray="4 4" x1={padding.left} x2={width - padding.right} y1={yScale(tick)} y2={yScale(tick)} />
              <text fill="#64748b" fontSize="11" textAnchor="end" x={padding.left - 10} y={yScale(tick) + 4}>
                {formatCurrency(tick)}
              </text>
            </g>
          ))}

          <line stroke="#334155" strokeWidth="1.5" x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} />
          <line stroke="#334155" strokeWidth="1.5" x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} />
          <line stroke="#0f172a" strokeDasharray="5 5" x1={xScale(xThreshold)} x2={xScale(xThreshold)} y1={padding.top} y2={height - padding.bottom} />
          <line stroke="#0f172a" strokeDasharray="5 5" x1={padding.left} x2={width - padding.right} y1={yScale(yThreshold)} y2={yScale(yThreshold)} />

          <text fill="#1e40af" fontSize="11" fontWeight="600" x={padding.left + 12} y={padding.top + 20}>
            Rentable con riesgo
          </text>
          <text fill="#166534" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 12} y={padding.top + 20}>
            Gerente modelo
          </text>
          <text fill="#991b1b" fontSize="11" fontWeight="600" x={padding.left + 12} y={height - padding.bottom - 18}>
            Intervencion prioritaria
          </text>
          <text fill="#92400e" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 12} y={height - padding.bottom - 24}>
            <tspan x={width - padding.right - 12}>Buena gestion</tspan>
            <tspan x={width - padding.right - 12} dy="13">
              revisar finanzas
            </tspan>
          </text>

          {chartRecords.map((record) => {
            const radius = Math.max(10, Math.min(26, record.netSales / 2200));
            const x = xScale(record.score);
            const y = yScale(record.utility);
            return (
              <g
                className="cursor-pointer"
                key={record.id}
                onClick={() => onSelect(record.id)}
              >
                <circle
                  cx={x}
                  cy={y}
                  fill={record.bonusState === "Bloqueado" ? "#dc2626" : record.bonusState === "Retenido" ? "#f59e0b" : "#2563eb"}
                  opacity="0.84"
                  r={radius}
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                <text fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle" x={x} y={y + 4}>
                  {record.manager.slice(0, 2)}
                </text>
                <title>{`${record.manager}
Sucursal: ${record.branch}
Score: ${record.score}
Utilidad: ${formatCurrency(record.utility)}
Venta: ${formatCurrency(record.netSales)}
Bono: ${formatCurrency(record.bonusProjected)}
Estado: ${record.bonusState}`}</title>
              </g>
            );
          })}

          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={padding.left + plotWidth / 2} y={height - 18}>
            Score gerencial
          </text>
          <text
            fill="#334155"
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
            transform={`rotate(-90 ${26} ${padding.top + plotHeight / 2})`}
            x="26"
            y={padding.top + plotHeight / 2}
          >
            Utilidad operativa
          </text>
        </svg>
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-slate-500",
            label: "Eje X",
            text: "score gerencial; mientras mas a la derecha, mejor desempeno integral.",
          },
          {
            color: "bg-slate-500",
            label: "Eje Y",
            text: "utilidad operativa; mientras mas arriba, mas rentable es la gestion.",
          },
          {
            color: "bg-blue-600",
            label: "Azul",
            text: "bono proyectado o en revision sin bloqueo activo.",
          },
          {
            color: "bg-amber-500",
            label: "Naranja",
            text: "bono retenido; requiere evidencia o validacion antes de aprobar.",
          },
          {
            color: "bg-red-600",
            label: "Rojo",
            text: "bono bloqueado por una condicion critica.",
          },
          {
            color: "bg-slate-500",
            label: "Tamano",
            text: "venta gestionada por el gerente.",
          },
        ]}
      />
    </section>
  );
}

function BonusWaterfall({ record }: { record: ManagerBonusRecord }) {
  const maxAmount = Math.max(
    ...record.waterfall.map((step) => Math.abs(step.amount)),
    record.bonusPotential,
    1,
  );

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BadgeDollarSign className="size-4 text-primary" />
          Composicion del bono
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Bono potencial, ajustes, penalizaciones y bono proyectado.
        </p>
      </div>
      <div className="grid gap-3">
        {record.waterfall.map((step) => {
          const isNegative = step.amount < 0;
          const width = Math.max(8, (Math.abs(step.amount) / maxAmount) * 100);
          return (
            <div className="grid gap-1" key={step.label}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium">{step.label}</span>
                <span
                  className={cn(
                    "font-semibold",
                    isNegative ? "text-red-700" : step.kind === "final" ? "text-blue-700" : "text-emerald-700",
                  )}
                >
                  {isNegative ? "-" : ""}
                  {formatCurrency(Math.abs(step.amount))}
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted">
                <div
                  className={cn(
                    "h-3 rounded-full",
                    isNegative ? "bg-red-500" : step.kind === "final" ? "bg-blue-600" : "bg-emerald-600",
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{step.note}</p>
            </div>
          );
        })}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-emerald-600",
            label: "Verde",
            text: "monto positivo o base que suma al bono.",
          },
          {
            color: "bg-red-500",
            label: "Rojo",
            text: "descuento, penalizacion, retencion o bloqueo que reduce el bono.",
          },
          {
            color: "bg-blue-600",
            label: "Azul",
            text: "bono final proyectado antes de aprobacion.",
          },
          {
            color: "bg-slate-500",
            label: "Largo de barra",
            text: "tamano del monto comparado contra el mayor valor del calculo.",
          },
        ]}
      />
    </section>
  );
}

function ReductionPareto({ records }: { records: ManagerBonusRecord[] }) {
  const causes = useMemo(() => {
    const totals = new Map<string, { amount: number; count: number }>();

    records.forEach((record) => {
      record.reductionCauses.forEach((cause) => {
        const current = totals.get(cause.cause) ?? { amount: 0, count: 0 };
        current.amount += cause.amount;
        current.count += cause.count;
        totals.set(cause.cause, current);
      });
    });

    return Array.from(totals, ([cause, value]) => ({
      cause,
      ...value,
    }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [records]);
  const maxAmount = Math.max(...causes.map((cause) => cause.amount), 1);

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="size-4 text-primary" />
          Causas de reduccion o bloqueo
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Pareto de las causas que reducen, retienen o bloquean bonos.
        </p>
      </div>
      <div className="grid gap-3">
        {causes.map((cause) => (
          <div className="grid gap-1" key={cause.cause}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{cause.cause}</span>
              <span className="text-muted-foreground">
                {formatCurrency(cause.amount)} / {cause.count} casos
              </span>
            </div>
            <ProgressBar color="bg-rose-600" value={(cause.amount / maxAmount) * 100} />
          </div>
        ))}
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-slate-500",
            label: "Eje Y",
            text: "cada fila es una causa que reduce, retiene o bloquea bonos.",
          },
          {
            color: "bg-rose-600",
            label: "Barra roja",
            text: "dinero estimado que se pierde o se retiene por esa causa.",
          },
          {
            color: "bg-slate-500",
            label: "Numero de casos",
            text: "cantidad de gerentes afectados por esa causa.",
          },
          {
            color: "bg-slate-500",
            label: "Decision",
            text: "prioriza corregir primero la causa con mayor impacto monetario.",
          },
        ]}
      />
    </section>
  );
}

function TalentMatrix({ records }: { records: ManagerBonusRecord[] }) {
  const chartRecords = records.slice(0, 10);
  const width = 640;
  const height = 300;
  const padding = { bottom: 48, left: 52, right: 28, top: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  function xScale(value: number) {
    return padding.left + (value / 100) * plotWidth;
  }

  function yScale(value: number) {
    return padding.top + (1 - value / 100) * plotHeight;
  }

  function potential(record: ManagerBonusRecord) {
    return Math.round(
      Math.max(
        0,
        Math.min(
          100,
          62 + record.scoreDelta * 3 + record.dataQuality * 0.22 - record.staffTurnoverRate * 80,
        ),
      ),
    );
  }

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UsersRound className="size-4 text-primary" />
          Matriz de talento gerencial
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Eje X: desempeno actual. Eje Y: tendencia de gestion revisable por humanos.
        </p>
      </div>
      <div className="overflow-hidden rounded-md border bg-background p-2">
        <svg
          aria-label="Matriz de talento gerencial"
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[33, 66].map((value) => (
            <g key={value}>
              <line stroke="#cbd5e1" strokeDasharray="4 4" x1={xScale(value)} x2={xScale(value)} y1={padding.top} y2={height - padding.bottom} />
              <line stroke="#cbd5e1" strokeDasharray="4 4" x1={padding.left} x2={width - padding.right} y1={yScale(value)} y2={yScale(value)} />
            </g>
          ))}
          <rect fill="none" height={plotHeight} stroke="#334155" strokeWidth="1.5" width={plotWidth} x={padding.left} y={padding.top} />
          <text fill="#166534" fontSize="11" fontWeight="600" textAnchor="end" x={width - padding.right - 10} y={padding.top + 18}>
            Alto desempeno
          </text>
          <text fill="#991b1b" fontSize="11" fontWeight="600" x={padding.left + 10} y={height - padding.bottom - 12}>
            Intervencion necesaria
          </text>
          {chartRecords.map((record) => {
            const x = xScale(record.score);
            const y = yScale(potential(record));
            return (
              <g key={record.id}>
                <circle
                  cx={x}
                  cy={y}
                  fill={record.status === "Critico" ? "#dc2626" : record.status === "Precaucion" ? "#f59e0b" : "#2563eb"}
                  opacity="0.86"
                  r="11"
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                <text fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle" x={x} y={y + 3}>
                  {record.manager.slice(0, 2)}
                </text>
                <title>{`${record.manager}
Desempeno: ${record.score}
Tendencia: ${potential(record)}
Estado: ${record.status}`}</title>
              </g>
            );
          })}
          <text fill="#334155" fontSize="12" fontWeight="600" textAnchor="middle" x={padding.left + plotWidth / 2} y={height - 12}>
            Desempeno actual
          </text>
          <text
            fill="#334155"
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
            transform={`rotate(-90 ${18} ${padding.top + plotHeight / 2})`}
            x="18"
            y={padding.top + plotHeight / 2}
          >
            Tendencia
          </text>
        </svg>
      </div>
      <ChartExplanation
        items={[
          {
            color: "bg-slate-500",
            label: "Eje X",
            text: "desempeno actual del gerente medido por su score integral.",
          },
          {
            color: "bg-slate-500",
            label: "Eje Y",
            text: "tendencia de gestion; debe revisarse con criterio humano antes de decidir.",
          },
          {
            color: "bg-blue-600",
            label: "Azul",
            text: "gerente saludable o sobresaliente.",
          },
          {
            color: "bg-amber-500",
            label: "Naranja",
            text: "gerente en precaucion.",
          },
          {
            color: "bg-red-600",
            label: "Rojo",
            text: "gerente critico o con intervencion necesaria.",
          },
        ]}
      />
    </section>
  );
}

function ManagerProfile({ record }: { record: ManagerBonusRecord }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold tracking-normal">
            Perfil individual del gerente
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            {record.manager} / {record.branch} / {record.line}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={statusClass(record.status)}>{record.status}</Badge>
          <Badge className={bonusStateClass(record.bonusState)}>
            {record.bonusState}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Score total", value: `${record.score}`, note: `${record.scoreDelta >= 0 ? "+" : ""}${record.scoreDelta} pts vs periodo anterior` },
          { label: "Cumplimiento", value: formatRate(record.targetCompletionRate), note: "meta aprobada del periodo" },
          { label: "Bono potencial", value: formatCurrency(record.bonusPotential), note: `multiplicador ${(record.scoreMultiplier * 100).toFixed(0)}%` },
          { label: "Bono proyectado", value: formatCurrency(record.bonusProjected), note: record.bonusState },
          { label: "Bono aprobado", value: record.bonusApproved > 0 ? formatCurrency(record.bonusApproved) : "Pendiente", note: "requiere validacion final" },
          { label: "Bloqueos", value: `${record.blockingConditions.length}`, note: record.principalGap },
          { label: "Fortaleza", value: record.principalStrength, note: "dimension principal" },
          { label: "Accion", value: record.goalType, note: record.recommendedAction },
        ].map((item) => (
          <article className="rounded-md border bg-background p-3" key={item.label}>
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-1 text-lg font-semibold tracking-normal">{item.value}</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.note}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border bg-background p-3">
          <div className="mb-3 text-sm font-medium">Evidencia y trazabilidad</div>
          <div className="grid gap-3">
            {record.blockingConditions.length > 0 ? (
              record.blockingConditions.map((condition) => (
                <article className="rounded-md border bg-card p-3 text-xs" key={`${condition.reason}-${condition.date}`}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{condition.category}</Badge>
                    <Badge className={condition.state === "Bloquea" ? "bg-red-100 text-red-800 hover:bg-red-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}>
                      {condition.state}
                    </Badge>
                  </div>
                  <div className="font-medium">{condition.reason}</div>
                  <p className="mt-1 leading-5 text-muted-foreground">
                    {condition.evidence}
                  </p>
                  <div className="mt-2 grid gap-1 text-muted-foreground">
                    <span>Responsable: {condition.reviewer}</span>
                    <span>Fecha: {condition.date}</span>
                    <span>Plan: {condition.correctivePlan}</span>
                    <span>Reevaluacion: {condition.reevaluationDate}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground">
                Sin bloqueos activos. Mantener evidencia de metas, cierres y datos.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-md border bg-background p-3">
          <div className="mb-3 text-sm font-medium">Flujo de aprobacion</div>
          <div className="grid gap-2 text-xs">
            {[
              "Gerente visualiza calculo y agrega evidencia",
              "Direccion revisa resultados de gestion",
              "Finanzas valida utilidad, margen y cierres",
              "Recursos Humanos aprueba pago",
              "Auditoria consulta cambios y trazabilidad",
              "Administrador configura reglas y pesos",
            ].map((step, index) => (
              <div className="flex items-center gap-3 rounded-md border bg-card p-2" key={step}>
                <div className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BonusSimulator({ record }: { record: ManagerBonusRecord }) {
  const [occupancyLift, setOccupancyLift] = useState(6);
  const [marginLift, setMarginLift] = useState(3);
  const [dataLift, setDataLift] = useState(4);

  useEffect(() => {
    setOccupancyLift(6);
    setMarginLift(3);
    setDataLift(4);
  }, [record.id]);

  function multiplier(score: number) {
    if (score < 70) {
      return 0;
    }

    if (score < 80) {
      return 0.5;
    }

    if (score < 90) {
      return 0.8;
    }

    return 1;
  }

  const simulatedScore = Math.round(
    Math.min(100, record.score + occupancyLift * 0.35 + marginLift * 0.75 + dataLift * 0.25),
  );
  const simulatedBonus = Math.round(
    record.bonusPotential *
      multiplier(simulatedScore) *
      Math.min(1.1, record.fulfillmentFactor + marginLift / 100) *
      Math.min(1.05, record.qualityFactor + dataLift / 180),
  );

  return (
    <section className="rounded-md border bg-card p-4">
      <div className="mb-4 grid gap-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="size-4 text-primary" />
          Simulador de bono
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Planeacion solamente: no modifica datos reales ni reglas aprobadas.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-4">
          {[
            {
              label: "Subir ocupacion efectiva",
              value: occupancyLift,
              max: 15,
              setter: setOccupancyLift,
              suffix: "pts",
            },
            {
              label: "Mejorar margen",
              value: marginLift,
              max: 8,
              setter: setMarginLift,
              suffix: "pts",
            },
            {
              label: "Mejorar calidad de datos",
              value: dataLift,
              max: 12,
              setter: setDataLift,
              suffix: "pts",
            },
          ].map((control) => (
            <label className="grid gap-2 text-sm" key={control.label}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{control.label}</span>
                <span className="text-muted-foreground">
                  +{control.value} {control.suffix}
                </span>
              </div>
              <input
                className="w-full accent-primary"
                max={control.max}
                min="0"
                onChange={(event) => control.setter(Number(event.target.value))}
                type="range"
                value={control.value}
              />
            </label>
          ))}
        </div>
        <div className="grid gap-3 rounded-md border bg-background p-3">
          <div>
            <div className="text-xs text-muted-foreground">Score actual</div>
            <div className="text-2xl font-semibold">{record.score}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Score simulado</div>
            <div className="text-2xl font-semibold text-emerald-700">
              {simulatedScore}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Bono proyectado</div>
            <div className="text-2xl font-semibold">
              {formatCurrency(simulatedBonus)}
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Si se corrigen estas brechas, el bono podria cambiar de{" "}
            {formatCurrency(record.bonusProjected)} a {formatCurrency(simulatedBonus)}.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ManagerBonusDashboard() {
  const [context, setContext] = useState<StoredContext | null>(null);
  const [filters, setFilters] = useState(createDefaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const lineSlug = useMemo(() => resolveContextLine(context), [context]);
  const screen = useMemo(() => getManagerBonusScreen(lineSlug), [lineSlug]);
  const contextRecords = useMemo(() => {
    let records = screen.records;
    const branchName = context?.branchName;
    const managerName = context?.managerName;

    if (branchName && !/^Todas/i.test(branchName)) {
      records = records.filter((record) => record.branch === branchName);
    }

    if (
      managerName &&
      managerName !== "Todos los gerentes" &&
      !/^Gerencia operaciones/i.test(managerName) &&
      managerName !== "Gerentes sucursales SV"
    ) {
      records = records.filter((record) => record.manager === managerName);
    }

    return records;
  }, [context?.branchName, context?.managerName, screen.records]);
  const filteredRecords = useMemo(
    () =>
      contextRecords.filter(
        (record) =>
          (filters.bonusState === allOption || record.bonusState === filters.bonusState) &&
          (filters.goalType === allOption || record.goalType === filters.goalType) &&
          (filters.managerType === allOption || record.managerType === filters.managerType) &&
          (filters.status === allOption || record.status === filters.status),
      ),
    [contextRecords, filters],
  );

  useEffect(() => {
    if (filteredRecords.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredRecords.some((record) => record.id === selectedId)) {
      setSelectedId(filteredRecords[0]?.id ?? null);
    }
  }, [filteredRecords, selectedId]);

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedId) ??
    filteredRecords[0] ??
    null;
  const chart = useMemo(
    () => buildManagerBonusTrendChart(filteredRecords),
    [filteredRecords],
  );

  return (
    <section className="flex w-full flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
            Entorno DEMO
          </Badge>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-card">
              <UsersRound className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                {screen.title}
              </h1>
              <p className="text-sm text-muted-foreground">{screen.subtitle}</p>
            </div>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
            {screen.description}
          </p>
        </div>
        <ScopeCard context={context} lineSlug={lineSlug} />
      </div>

      <ManagerFiltersPanel
        filters={filters}
        onChange={setFilters}
        records={contextRecords}
      />

      <ReadableTabs
        tabs={[
          {
            id: "lectura-gerentes",
            label: "Lectura rapida",
            description: "KPIs, pesos e insights antes del ranking.",
            children: (
              <>
                <ExecutiveManagerPerformanceTable records={filteredRecords} />
                <GroupedMetrics metrics={screen.metrics} />
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <WeightModel weights={screen.weights} />
                  <section className="rounded-md border bg-card p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                      <ClipboardList className="size-4 text-primary" />
                      Insights ejecutivos
                    </div>
                    <div className="grid gap-3 text-sm text-muted-foreground">
                      {screen.executiveInsights.map((insight) => (
                        <div
                          className="rounded-md border bg-background p-3"
                          key={insight}
                        >
                          {insight}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </>
            ),
          },
          {
            id: "bonos-gerentes",
            label: "Elegibilidad y bono",
            description: "Ranking, dimensiones y bono proyectado.",
            children:
              filteredRecords.length > 0 && selectedRecord ? (
                <>
                  <ManagerRankingTable
                    onSelect={setSelectedId}
                    records={filteredRecords}
                    selectedId={selectedRecord.id}
                  />
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ScoreDimensionBars record={selectedRecord} />
                    <BonusWaterfall record={selectedRecord} />
                  </div>
                </>
              ) : (
                <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
                  No hay gerentes para los filtros seleccionados.
                </section>
              ),
          },
          {
            id: "comparacion-gerentes",
            label: "Comparacion",
            description: "Tendencias y matrices para decidir.",
            children:
              filteredRecords.length > 0 && selectedRecord ? (
                <>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ComplianceBonusChart records={filteredRecords} />
                    <ProfitabilityPerformanceMatrix
                      onSelect={setSelectedId}
                      records={filteredRecords}
                    />
                  </div>
                  <AnalyticsComparisonChart
                    description={chart.description}
                    enableSeriesSelection
                    insights={chart.insights}
                    maxSelectableSeries={5}
                    metricOptions={chart.metricOptions}
                    series={chart.series}
                    seriesSelectionHint="Elige hasta cinco gerentes para comparar sus lineas en la grafica."
                    seriesSelectorLabel="Gerentes a comparar"
                    title={chart.title}
                    xLabels={chart.xLabels}
                    yLabel={chart.yLabel}
                  />
                  <div className="grid gap-4 xl:grid-cols-2">
                    <ReductionPareto records={filteredRecords} />
                    <TalentMatrix records={filteredRecords} />
                  </div>
                </>
              ) : (
                <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
                  No hay gerentes para los filtros seleccionados.
                </section>
              ),
          },
          {
            id: "detalle-gerente",
            label: "Detalle y simulacion",
            description: "Perfil, causa y cambio posible del bono.",
            children:
              filteredRecords.length > 0 && selectedRecord ? (
                <>
                  <ManagerProfile record={selectedRecord} />
                  <BonusSimulator record={selectedRecord} />
                  <section className="rounded-md border bg-muted p-4 text-sm leading-6 text-muted-foreground">
                    <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                      <GitBranch className="size-4 text-primary" />
                      {screen.rule}
                    </div>
                    <p>
                      Resultado de sucursal, desempeno del gerente, bono
                      proyectado, bono aprobado, bloqueos, evidencia y
                      trazabilidad se muestran por separado para que el calculo
                      no sea una caja negra.
                    </p>
                  </section>
                </>
              ) : (
                <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
                  No hay gerentes para los filtros seleccionados.
                </section>
              ),
          },
        ]}
      />
    </section>
  );
}
