import type { PoolClient } from "pg";

import type { AuthorizationActor } from "@/lib/security/authorization-policy";
import {
  getMissingDatabaseConfig,
  getPostgresPool,
  withPostgresRlsContext,
} from "@/lib/server/database";

import {
  buildOfficialExecutiveSnapshot,
  buildOfficialExecutiveSnapshotForTests,
  dateToPeriod,
  emptyOfficialExecutiveSnapshot,
  filterPublishedRowsForSnapshot,
  selectedPeriod,
} from "./official-bi-snapshot";
import type {
  InsightRow,
  KpiResultRow,
  OfficialBusinessLineCode,
  OfficialDashboardFilter,
  OfficialDashboardMode,
  OfficialExecutiveSnapshot,
  OfficialInsight,
  OfficialKpiCategory,
  OfficialKpiRecord,
  OfficialLineSummary,
  OfficialTargetComparison,
  PublishedVersionRow,
  TargetRow,
} from "./official-bi-snapshot";

export {
  buildOfficialExecutiveSnapshotForTests,
  dateToPeriod,
  filterPublishedRowsForSnapshot,
  selectedPeriod,
};
export type {
  OfficialBusinessLineCode,
  OfficialDashboardFilter,
  OfficialDashboardMode,
  OfficialExecutiveSnapshot,
  OfficialInsight,
  OfficialKpiCategory,
  OfficialKpiRecord,
  OfficialLineSummary,
  OfficialTargetComparison,
};

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
        formula,
        unit,
        value,
        status,
        required_fields,
        missing_fields
      from public.closing_kpi_results
      where closing_version_id = any($1::uuid[])
      order by kpi_id
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

export async function getOfficialExecutiveSnapshot(
  actor: AuthorizationActor,
  filter: OfficialDashboardFilter = {},
): Promise<OfficialExecutiveSnapshot> {
  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    return emptyOfficialExecutiveSnapshot(
      "configuration_error",
      `PostgreSQL no esta configurado para lectura oficial: ${missingConfig.join(", ")}.`,
    );
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    return await withPostgresRlsContext(client, actor, async () => {
      const allPublishedRows = await readPublishedVersions(client);
      const scopedRows = filterPublishedRowsForSnapshot(allPublishedRows, filter);
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

      return buildOfficialExecutiveSnapshot(
        periodRows,
        kpiRows,
        scopedTargets,
        insightRows,
        period,
      );
    });
  } catch (error) {
    return emptyOfficialExecutiveSnapshot(
      "configuration_error",
      error instanceof Error
        ? error.message
        : "No se pudo verificar la lectura oficial de PostgreSQL.",
    );
  } finally {
    client.release();
  }
}
