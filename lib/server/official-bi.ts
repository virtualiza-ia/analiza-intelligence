import type { PoolClient } from "pg";

import type { AuthorizationActor } from "@/lib/security/authorization-policy";
import {
  getMissingDatabaseConfig,
  getPostgresPool,
  withPostgresRlsContext,
} from "@/lib/server/database";

export type OfficialBusinessLineCode =
  | "PHYSIOTHERAPY"
  | "LABORATORY"
  | "IMAGING";

export type OfficialDashboardFilter = {
  branchId?: string;
  businessLineId?: string;
  companyId?: string;
  countryId?: string;
  periodEnd?: string;
  periodStart?: string;
};

export type OfficialLineSummary = {
  branchCount: number;
  businessLine: OfficialBusinessLineCode;
  lineName: string;
  publishedClosings: number;
  qualityScore: number | null;
  revenueActual: number | null;
  revenueTarget: number | null;
  revenueCompliance: number | null;
  status: "cumplido" | "vigilar" | "critico" | "sin_meta";
};

export type OfficialTargetComparison = {
  actualValue: number | null;
  branchName: string;
  businessLine: OfficialBusinessLineCode;
  kpiId: string;
  kpiLabel: string;
  lineName: string;
  period: string;
  status: "cumplido" | "vigilar" | "critico" | "sin_resultado";
  targetValue: number;
  unit: "currency" | "count" | "ratio";
  variance: number | null;
  compliance: number | null;
};

export type OfficialInsight = {
  branchName: string;
  businessLine: OfficialBusinessLineCode;
  impact: string;
  kpiId: string;
  lineName: string;
  message: string;
  period: string;
  recommendedAction: string;
  severity: "critica" | "alta" | "media" | "positiva";
  title: string;
};

export type OfficialExecutiveSnapshot = {
  dataStatus: "available" | "no_data" | "configuration_error";
  errorMessage?: string;
  generatedAt: string;
  insights: OfficialInsight[];
  lineSummaries: OfficialLineSummary[];
  period: string | null;
  sourceTables: string[];
  targetComparisons: OfficialTargetComparison[];
  totals: {
    approvedTargets: number;
    officialInsights: number;
    publishedClosings: number;
    revenueActual: number | null;
    revenueTarget: number | null;
    revenueCompliance: number | null;
  };
};

type PublishedVersionRow = {
  branch_id: string;
  branch_name: string;
  business_line: OfficialBusinessLineCode;
  company_id: string;
  company_name: string;
  country_id: string;
  country_name: string;
  data_quality_score: string | number | null;
  period_month: string | Date;
  version_id: string;
};

type KpiResultRow = {
  closing_version_id: string;
  kpi_id: string;
  label: string;
  unit: "currency" | "count" | "ratio";
  value: string | number | null;
};

type TargetRow = {
  branch_id: string;
  business_line: OfficialBusinessLineCode;
  kpi_id: string;
  label: string;
  period_month: string | Date;
  target_value: string | number;
  unit: "currency" | "count" | "ratio";
};

type InsightRow = {
  branch_id: string;
  business_line: OfficialBusinessLineCode;
  impact: string;
  kpi_id: string;
  message: string;
  period_month: string | Date;
  recommended_action: string;
  severity: "critica" | "alta" | "media" | "positiva";
  title: string;
};

const sourceTables = [
  "monthly_closings",
  "closing_versions",
  "closing_kpi_results",
  "kpi_targets",
  "generated_insights",
];

const lineNames: Record<OfficialBusinessLineCode, string> = {
  IMAGING: "Imagenes",
  LABORATORY: "Laboratorio",
  PHYSIOTHERAPY: "Fisioterapia",
};

function dateToPeriod(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 7);
  }

  return value.slice(0, 7);
}

function numberOrNull(value: string | number | null) {
  if (value === null) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function isRevenueKpi(kpiId: string, label: string) {
  const normalized = `${kpiId} ${label}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    normalized.includes("facturacion") ||
    normalized.includes("revenue") ||
    normalized.includes("venta")
  );
}

function resolveFilterLine(filter: OfficialDashboardFilter) {
  if (filter.businessLineId === "business-line-fisioterapia") {
    return "PHYSIOTHERAPY";
  }

  if (filter.businessLineId === "business-line-laboratorio") {
    return "LABORATORY";
  }

  if (filter.businessLineId === "business-line-imagenes") {
    return "IMAGING";
  }

  return null;
}

function isScopeWildcard(value?: string) {
  return !value || value.startsWith("__");
}

function matchesScope(row: PublishedVersionRow, filter: OfficialDashboardFilter) {
  const line = resolveFilterLine(filter);

  return (
    (isScopeWildcard(filter.countryId) || row.country_id === filter.countryId) &&
    (isScopeWildcard(filter.companyId) || row.company_id === filter.companyId) &&
    (isScopeWildcard(filter.branchId) || row.branch_id === filter.branchId) &&
    (!line || row.business_line === line)
  );
}

function selectedPeriod(
  rows: PublishedVersionRow[],
  filter: OfficialDashboardFilter,
) {
  const requestedPeriod = filter.periodStart?.slice(0, 7);

  if (requestedPeriod && rows.some((row) => dateToPeriod(row.period_month) === requestedPeriod)) {
    return requestedPeriod;
  }

  return rows
    .map((row) => dateToPeriod(row.period_month))
    .sort()
    .at(-1) ?? null;
}

function sumValues(values: (number | null)[]) {
  const numericValues = values.filter((value): value is number => value !== null);

  if (numericValues.length === 0) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0);
}

function averageValues(values: (number | null)[]) {
  const numericValues = values.filter((value): value is number => value !== null);

  if (numericValues.length === 0) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function targetStatus(compliance: number | null) {
  if (compliance === null) {
    return "sin_meta" as const;
  }

  if (compliance >= 1) {
    return "cumplido" as const;
  }

  if (compliance >= 0.85) {
    return "vigilar" as const;
  }

  return "critico" as const;
}

function comparisonStatus(compliance: number | null) {
  if (compliance === null) {
    return "sin_resultado" as const;
  }

  if (compliance >= 1) {
    return "cumplido" as const;
  }

  if (compliance >= 0.85) {
    return "vigilar" as const;
  }

  return "critico" as const;
}

async function readPublishedVersions(client: PoolClient) {
  const result = await client.query<PublishedVersionRow>(
    `
      select
        cv.id as version_id,
        cv.business_line,
        cv.period_month,
        cv.country_id,
        c.name as country_name,
        cv.company_id,
        co.name as company_name,
        cv.branch_id,
        b.name as branch_name,
        cv.data_quality_score
      from public.closing_versions cv
      join public.monthly_closings mc on mc.id = cv.monthly_closing_id
      join public.countries c on c.id = cv.country_id
      join public.companies co on co.id = cv.company_id
      join public.branches b on b.id = cv.branch_id
      where cv.status = 'PUBLISHED'
        and cv.superseded_by_version_id is null
        and mc.published_version_id = cv.id
        and cv.is_demo = false
        and mc.is_demo = false
      order by cv.period_month desc, cv.business_line, b.name
    `,
  );

  return result.rows;
}

async function readKpiResults(client: PoolClient, versionIds: string[]) {
  if (versionIds.length === 0) {
    return [];
  }

  const result = await client.query<KpiResultRow>(
    `
      select
        closing_version_id,
        kpi_id,
        label,
        unit,
        value
      from public.closing_kpi_results
      where closing_version_id = any($1::uuid[])
        and status = 'CALCULABLE'
    `,
    [versionIds],
  );

  return result.rows;
}

async function readApprovedTargets(client: PoolClient) {
  const result = await client.query<TargetRow>(
    `
      select
        branch_id,
        business_line,
        period_month,
        kpi_id,
        label,
        target_value,
        unit
      from public.kpi_targets
      where status = 'active'
        and approved_at is not null
        and is_demo = false
      order by period_month desc, business_line, branch_id, kpi_id, version desc
    `,
  );

  return result.rows;
}

async function readOfficialInsights(client: PoolClient, versionIds: string[]) {
  if (versionIds.length === 0) {
    return [];
  }

  const result = await client.query<InsightRow>(
    `
      select
        branch_id,
        business_line,
        period_month,
        severity,
        kpi_id,
        title,
        message,
        impact,
        recommended_action
      from public.generated_insights
      where closing_version_id = any($1::uuid[])
      order by
        case severity
          when 'critica' then 1
          when 'alta' then 2
          when 'media' then 3
          else 4
        end,
        created_at desc
    `,
    [versionIds],
  );

  return result.rows;
}

function buildSnapshot(
  publishedRows: PublishedVersionRow[],
  kpiRows: KpiResultRow[],
  targetRows: TargetRow[],
  insightRows: InsightRow[],
  period: string | null,
): OfficialExecutiveSnapshot {
  const branchNameById = new Map(
    publishedRows.map((row) => [row.branch_id, row.branch_name]),
  );
  const kpisByVersion = new Map<string, KpiResultRow[]>();

  for (const kpi of kpiRows) {
    const existing = kpisByVersion.get(kpi.closing_version_id) ?? [];
    existing.push(kpi);
    kpisByVersion.set(kpi.closing_version_id, existing);
  }

  const targetComparisons = targetRows.flatMap<OfficialTargetComparison>((target) => {
    const targetPeriod = dateToPeriod(target.period_month);

    if (targetPeriod !== period) {
      return [];
    }

    const matchingVersions = publishedRows.filter(
      (row) =>
        row.business_line === target.business_line &&
        row.branch_id === target.branch_id &&
        dateToPeriod(row.period_month) === targetPeriod,
    );
    const matchingKpis = matchingVersions.flatMap((row) =>
      (kpisByVersion.get(row.version_id) ?? []).filter(
        (kpi) => kpi.kpi_id === target.kpi_id,
      ),
    );
    const actualValue =
      target.unit === "ratio"
        ? averageValues(matchingKpis.map((kpi) => numberOrNull(kpi.value)))
        : sumValues(matchingKpis.map((kpi) => numberOrNull(kpi.value)));
    const targetValue = Number(target.target_value);
    const compliance =
      actualValue !== null && targetValue > 0 ? actualValue / targetValue : null;

    return [
      {
        actualValue,
        branchName: branchNameById.get(target.branch_id) ?? "Sucursal autorizada",
        businessLine: target.business_line,
        compliance,
        kpiId: target.kpi_id,
        kpiLabel: target.label,
        lineName: lineNames[target.business_line],
        period: targetPeriod,
        status: comparisonStatus(compliance),
        targetValue,
        unit: target.unit,
        variance: actualValue !== null ? actualValue - targetValue : null,
      },
    ];
  });

  const lineSummaries = Object.entries(lineNames).flatMap<OfficialLineSummary>(
    ([businessLine, lineName]) => {
      const typedLine = businessLine as OfficialBusinessLineCode;
      const lineRows = publishedRows.filter(
        (row) => row.business_line === typedLine,
      );

      if (lineRows.length === 0) {
        return [];
      }

      const lineKpis = lineRows.flatMap((row) =>
        kpisByVersion.get(row.version_id) ?? [],
      );
      const revenueKpis = lineKpis.filter((kpi) =>
        isRevenueKpi(kpi.kpi_id, kpi.label),
      );
      const lineTargets = targetComparisons.filter(
        (comparison) =>
          comparison.businessLine === typedLine &&
          isRevenueKpi(comparison.kpiId, comparison.kpiLabel),
      );
      const revenueActual = sumValues(
        revenueKpis.map((kpi) => numberOrNull(kpi.value)),
      );
      const revenueTarget = sumValues(
        lineTargets.map((target) => target.targetValue),
      );
      const revenueCompliance =
        revenueActual !== null && revenueTarget !== null && revenueTarget > 0
          ? revenueActual / revenueTarget
          : null;

      return [
        {
          branchCount: new Set(lineRows.map((row) => row.branch_id)).size,
          businessLine: typedLine,
          lineName,
          publishedClosings: lineRows.length,
          qualityScore: averageValues(
            lineRows.map((row) => numberOrNull(row.data_quality_score)),
          ),
          revenueActual,
          revenueCompliance,
          revenueTarget,
          status: targetStatus(revenueCompliance),
        },
      ];
    },
  );

  const officialInsights = insightRows
    .filter((insight) => dateToPeriod(insight.period_month) === period)
    .map<OfficialInsight>((insight) => ({
      branchName: branchNameById.get(insight.branch_id) ?? "Sucursal autorizada",
      businessLine: insight.business_line,
      impact: insight.impact,
      kpiId: insight.kpi_id,
      lineName: lineNames[insight.business_line],
      message: insight.message,
      period: dateToPeriod(insight.period_month),
      recommendedAction: insight.recommended_action,
      severity: insight.severity,
      title: insight.title,
    }));
  const revenueActual = sumValues(
    lineSummaries.map((summary) => summary.revenueActual),
  );
  const revenueTarget = sumValues(
    lineSummaries.map((summary) => summary.revenueTarget),
  );

  return {
    dataStatus: publishedRows.length > 0 ? "available" : "no_data",
    generatedAt: new Date().toISOString(),
    insights: officialInsights,
    lineSummaries,
    period,
    sourceTables,
    targetComparisons,
    totals: {
      approvedTargets: targetComparisons.length,
      officialInsights: officialInsights.length,
      publishedClosings: publishedRows.length,
      revenueActual,
      revenueCompliance:
        revenueActual !== null && revenueTarget !== null && revenueTarget > 0
          ? revenueActual / revenueTarget
          : null,
      revenueTarget,
    },
  };
}

export async function getOfficialExecutiveSnapshot(
  actor: AuthorizationActor,
  filter: OfficialDashboardFilter = {},
): Promise<OfficialExecutiveSnapshot> {
  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    return {
      dataStatus: "configuration_error",
      errorMessage: `PostgreSQL no esta configurado para lectura oficial: ${missingConfig.join(", ")}.`,
      generatedAt: new Date().toISOString(),
      insights: [],
      lineSummaries: [],
      period: null,
      sourceTables,
      targetComparisons: [],
      totals: {
        approvedTargets: 0,
        officialInsights: 0,
        publishedClosings: 0,
        revenueActual: null,
        revenueCompliance: null,
        revenueTarget: null,
      },
    };
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    return await withPostgresRlsContext(client, actor, async () => {
      const allPublishedRows = await readPublishedVersions(client);
      const scopedRows = allPublishedRows.filter((row) => matchesScope(row, filter));
      const period = selectedPeriod(scopedRows, filter);
      const periodRows = scopedRows.filter(
        (row) => period !== null && dateToPeriod(row.period_month) === period,
      );
      const versionIds = periodRows.map((row) => row.version_id);
      const [kpiRows, targetRows, insightRows] = await Promise.all([
        readKpiResults(client, versionIds),
        readApprovedTargets(client),
        readOfficialInsights(client, versionIds),
      ]);
      const scopedTargets = targetRows.filter((target) =>
        periodRows.some(
          (row) =>
            row.business_line === target.business_line &&
            row.branch_id === target.branch_id,
        ),
      );

      return buildSnapshot(
        periodRows,
        kpiRows,
        scopedTargets,
        insightRows,
        period,
      );
    });
  } catch (error) {
    return {
      dataStatus: "configuration_error",
      errorMessage:
        error instanceof Error
          ? error.message
          : "No se pudo verificar la lectura oficial de PostgreSQL.",
      generatedAt: new Date().toISOString(),
      insights: [],
      lineSummaries: [],
      period: null,
      sourceTables,
      targetComparisons: [],
      totals: {
        approvedTargets: 0,
        officialInsights: 0,
        publishedClosings: 0,
        revenueActual: null,
        revenueCompliance: null,
        revenueTarget: null,
      },
    };
  } finally {
    client.release();
  }
}
