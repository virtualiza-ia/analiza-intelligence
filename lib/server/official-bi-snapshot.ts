export type OfficialBusinessLineCode =
  | "PHYSIOTHERAPY"
  | "LABORATORY"
  | "IMAGING";

export type OfficialDashboardMode =
  | "overview"
  | "finances"
  | "targets"
  | "insights"
  | "appointments"
  | "capacity"
  | "branches"
  | "professionals"
  | "services"
  | "laboratory"
  | "physiotherapy"
  | "imaging"
  | "operations"
  | "quality"
  | "managers";

export type OfficialDashboardFilter = {
  branchId?: string;
  businessLineId?: string;
  companyId?: string;
  countryId?: string;
  periodEnd?: string;
  periodStart?: string;
};

export type OfficialKpiUnit = "currency" | "count" | "ratio";
export type OfficialKpiStatus = "CALCULABLE" | "NOT_CALCULABLE";

export const officialKpiCategories = [
  "financial",
  "activity",
  "appointments",
  "capacity",
  "services",
  "professionals",
  "quality",
  "management",
  "operations",
  "general",
] as const;

export type OfficialKpiCategory = (typeof officialKpiCategories)[number];

export type OfficialKpiRecord = {
  branchId: string;
  branchName: string;
  businessLine: OfficialBusinessLineCode;
  categories: OfficialKpiCategory[];
  closingVersionId: string;
  formula: string;
  kpiId: string;
  kpiLabel: string;
  lineName: string;
  missingFields: string[];
  period: string;
  primaryCategory: OfficialKpiCategory;
  requiredFields: string[];
  status: OfficialKpiStatus;
  unit: OfficialKpiUnit;
  value: number | null;
};

export type OfficialKpiGroups = Record<OfficialKpiCategory, OfficialKpiRecord[]>;

export type OfficialLineSummary = {
  branchCount: number;
  businessLine: OfficialBusinessLineCode;
  calculableKpis: number;
  lineName: string;
  notCalculableKpis: number;
  publishedClosings: number;
  qualityScore: number | null;
  revenueActual: number | null;
  revenueTarget: number | null;
  revenueCompliance: number | null;
  status: "cumplido" | "vigilar" | "critico" | "sin_meta";
  totalKpis: number;
};

export type OfficialBranchSummary = {
  activityVolume: number | null;
  branchId: string;
  branchName: string;
  businessLine: OfficialBusinessLineCode;
  calculableKpis: number;
  lineName: string;
  notCalculableKpis: number;
  publishedClosings: number;
  qualityScore: number | null;
  revenueActual: number | null;
  totalKpis: number;
};

export type OfficialDataQualitySummary = {
  averageScore: number | null;
  calculableKpis: number;
  completeness: number | null;
  missingFieldCount: number;
  missingFields: string[];
  notCalculableKpis: number;
  publishedClosings: number;
  totalKpis: number;
};

export type OfficialLineageSummary = {
  branchId: string;
  branchName: string;
  businessLine: OfficialBusinessLineCode;
  closingVersionId: string;
  companyId: string;
  companyName: string;
  countryId: string;
  countryName: string;
  dataQualityScore: number | null;
  lineName: string;
  period: string;
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
  unit: OfficialKpiUnit;
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
  branchSummaries: OfficialBranchSummary[];
  dataQuality: OfficialDataQualitySummary;
  dataStatus: "available" | "no_data" | "configuration_error";
  errorMessage?: string;
  generatedAt: string;
  insights: OfficialInsight[];
  kpiGroups: OfficialKpiGroups;
  kpis: OfficialKpiRecord[];
  lineage: OfficialLineageSummary[];
  lineSummaries: OfficialLineSummary[];
  period: string | null;
  sourceTables: string[];
  targetComparisons: OfficialTargetComparison[];
  totals: {
    approvedTargets: number;
    calculableKpis: number;
    dataCompleteness: number | null;
    notCalculableKpis: number;
    officialInsights: number;
    publishedClosings: number;
    revenueActual: number | null;
    revenueTarget: number | null;
    revenueCompliance: number | null;
    totalKpis: number;
  };
};

export type PublishedVersionRow = {
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

export type KpiResultRow = {
  closing_version_id: string;
  formula: string;
  kpi_id: string;
  label: string;
  missing_fields: unknown;
  required_fields: unknown;
  status: OfficialKpiStatus;
  unit: OfficialKpiUnit;
  value: string | number | null;
};

export type TargetRow = {
  branch_id: string;
  business_line: OfficialBusinessLineCode;
  kpi_id: string;
  label: string;
  period_month: string | Date;
  target_value: string | number;
  unit: OfficialKpiUnit;
};

export type InsightRow = {
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

export type OfficialSnapshotTestInput = {
  filter?: OfficialDashboardFilter;
  insightRows?: InsightRow[];
  kpiRows?: KpiResultRow[];
  publishedRows?: PublishedVersionRow[];
  targetRows?: TargetRow[];
};

export const sourceTables = [
  "monthly_closings",
  "closing_versions",
  "closing_kpi_results",
  "kpi_targets",
  "generated_insights",
] as const;

export const officialBusinessLines = [
  "IMAGING",
  "LABORATORY",
  "PHYSIOTHERAPY",
] as const;

export const lineNames: Record<OfficialBusinessLineCode, string> = {
  IMAGING: "Imagenes",
  LABORATORY: "Laboratorio",
  PHYSIOTHERAPY: "Fisioterapia",
};

const kpiCategories: Record<string, readonly OfficialKpiCategory[]> = {
  brecha_conversion: ["appointments", "capacity", "operations", "management"],
  clientes_total: ["activity", "operations"],
  costo_por_estudio: ["financial", "services", "management"],
  costo_por_prueba: ["financial", "services", "management"],
  cumplimiento_facturacion: ["financial", "management"],
  cumplimiento_meta_produccion: ["activity", "operations", "management"],
  cumplimiento_venta: ["financial", "management"],
  downtime_rate: ["capacity", "operations", "quality", "management"],
  estudios_por_modalidad: ["services", "activity", "operations"],
  estudios_por_paciente: ["services", "activity", "operations"],
  estudios_realizados: ["activity", "operations", "management"],
  facturacion_neta: ["financial", "management"],
  informes_pendientes: ["quality", "capacity", "operations", "management"],
  ingreso_por_estudio: ["financial", "services", "management"],
  ingreso_por_fisioterapeuta: ["financial", "professionals", "management"],
  ingreso_por_hora: ["financial", "capacity", "management"],
  ingreso_por_prueba: ["financial", "services", "management"],
  margen_contribucion: ["financial", "management"],
  mix_modalidades: ["services", "activity", "operations"],
  ocupacion_agendada: ["appointments", "capacity", "operations", "management"],
  ocupacion_efectiva: ["capacity", "operations", "management"],
  ordenes_total: ["activity", "operations", "management"],
  perfiles_total: ["activity", "services", "operations"],
  porcentaje_margen: ["financial", "management"],
  productividad: ["professionals", "capacity", "operations", "management"],
  productividad_personal: [
    "professionals",
    "capacity",
    "operations",
    "management",
  ],
  pruebas_por_paciente: ["services", "activity", "operations"],
  pruebas_procesadas: ["activity", "operations", "management"],
  sesiones_por_paciente: ["services", "activity", "operations"],
  sesiones_total: ["activity", "operations", "management"],
  tasa_cancelacion: ["appointments", "capacity", "operations", "quality"],
  tasa_finalizacion: ["appointments", "operations", "quality", "management"],
  tasa_no_show: ["appointments", "capacity", "operations", "quality"],
  tasa_rechazo: ["quality", "operations", "management"],
  tasa_reproceso: ["quality", "operations", "management"],
  tat_informe: ["quality", "capacity", "operations", "management"],
  tat_promedio: ["quality", "operations", "management"],
  tat_realizacion: ["quality", "capacity", "operations", "management"],
  throughput: ["activity", "capacity", "operations"],
  ticket_promedio: ["financial", "services", "management"],
  utilizacion_equipo: ["capacity", "operations", "management"],
  utilizacion_modalidad: ["capacity", "services", "operations"],
  utilizacion_tecnica: ["capacity", "operations", "management"],
};

export function dateToPeriod(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 7);
  }

  return value.slice(0, 7);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function numberOrNull(value: string | number | null) {
  if (value === null) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function isRevenueKpi(kpiId: string, label: string) {
  const normalized = normalizeText(`${kpiId} ${label}`);

  return (
    normalized.includes("facturacion") ||
    normalized.includes("revenue") ||
    normalized.includes("venta")
  );
}

function isActivityVolumeKpi(kpi: OfficialKpiRecord) {
  return kpi.categories.includes("activity") && kpi.unit === "count";
}

export function normalizeBusinessLineFilter(value?: string) {
  return normalizeText(value ?? "").trim();
}

export function resolveFilterLine(filter: OfficialDashboardFilter) {
  const normalizedLine = normalizeBusinessLineFilter(filter.businessLineId);

  if (
    normalizedLine === "business-line-fisioterapia" ||
    normalizedLine === "fisioterapia" ||
    normalizedLine === "physiotherapy" ||
    normalizedLine.includes("fisioterapia") ||
    normalizedLine.includes("physiotherapy")
  ) {
    return "PHYSIOTHERAPY" as const;
  }

  if (
    normalizedLine === "business-line-laboratorio" ||
    normalizedLine === "laboratorio" ||
    normalizedLine === "laboratory" ||
    normalizedLine.includes("laboratorio") ||
    normalizedLine.includes("laboratory")
  ) {
    return "LABORATORY" as const;
  }

  if (
    normalizedLine === "business-line-imagenes" ||
    normalizedLine === "imagenes" ||
    normalizedLine === "imagen" ||
    normalizedLine === "imaging" ||
    normalizedLine.includes("imagenes") ||
    normalizedLine.includes("imagen") ||
    normalizedLine.includes("imaging")
  ) {
    return "IMAGING" as const;
  }

  return null;
}

export function isScopeWildcard(value?: string) {
  return !value || value.startsWith("__");
}

export function matchesScope(
  row: PublishedVersionRow,
  filter: OfficialDashboardFilter,
) {
  const line = resolveFilterLine(filter);

  return (
    (isScopeWildcard(filter.countryId) || row.country_id === filter.countryId) &&
    (isScopeWildcard(filter.companyId) || row.company_id === filter.companyId) &&
    (isScopeWildcard(filter.branchId) || row.branch_id === filter.branchId) &&
    (!line || row.business_line === line)
  );
}

function periodBoundary(value?: string) {
  return value?.slice(0, 7);
}

export function matchesPeriodWindow(
  row: PublishedVersionRow,
  filter: OfficialDashboardFilter,
) {
  const period = dateToPeriod(row.period_month);
  const start = periodBoundary(filter.periodStart);
  const end = periodBoundary(filter.periodEnd);

  return (!start || period >= start) && (!end || period <= end);
}

export function filterPublishedRowsForSnapshot(
  rows: PublishedVersionRow[],
  filter: OfficialDashboardFilter,
) {
  return rows.filter(
    (row) => matchesScope(row, filter) && matchesPeriodWindow(row, filter),
  );
}

export function selectedPeriod(
  rows: PublishedVersionRow[],
  filter: OfficialDashboardFilter,
) {
  const requestedPeriod = periodBoundary(filter.periodStart);
  const requestedEndPeriod = periodBoundary(filter.periodEnd);

  if (
    requestedPeriod &&
    rows.some((row) => dateToPeriod(row.period_month) === requestedPeriod)
  ) {
    return requestedPeriod;
  }

  if (
    requestedEndPeriod &&
    rows.some((row) => dateToPeriod(row.period_month) === requestedEndPeriod)
  ) {
    return requestedEndPeriod;
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

function stringArrayFromJson(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return stringArrayFromJson(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

function uniqueCategories(
  categories: readonly OfficialKpiCategory[],
): OfficialKpiCategory[] {
  return [...new Set(categories)];
}

function categoriesForKpi(
  kpiId: string,
  label: string,
): OfficialKpiCategory[] {
  const explicitCategories = kpiCategories[kpiId];

  if (explicitCategories) {
    return uniqueCategories(explicitCategories);
  }

  const normalized = normalizeText(`${kpiId} ${label}`);
  const inferred: OfficialKpiCategory[] = [];

  if (
    normalized.includes("facturacion") ||
    normalized.includes("margen") ||
    normalized.includes("costo") ||
    normalized.includes("ticket") ||
    normalized.includes("ingreso")
  ) {
    inferred.push("financial");
  }

  if (
    normalized.includes("cita") ||
    normalized.includes("agenda") ||
    normalized.includes("no-show") ||
    normalized.includes("cancelacion")
  ) {
    inferred.push("appointments");
  }

  if (
    normalized.includes("ocupacion") ||
    normalized.includes("capacidad") ||
    normalized.includes("utilizacion") ||
    normalized.includes("downtime")
  ) {
    inferred.push("capacity");
  }

  if (
    normalized.includes("servicio") ||
    normalized.includes("modalidad") ||
    normalized.includes("paciente")
  ) {
    inferred.push("services");
  }

  if (
    normalized.includes("productividad") ||
    normalized.includes("personal") ||
    normalized.includes("fisioterapeuta")
  ) {
    inferred.push("professionals");
  }

  if (
    normalized.includes("tat") ||
    normalized.includes("rechazo") ||
    normalized.includes("reproceso") ||
    normalized.includes("pendiente") ||
    normalized.includes("calidad")
  ) {
    inferred.push("quality");
  }

  if (
    normalized.includes("orden") ||
    normalized.includes("sesion") ||
    normalized.includes("prueba") ||
    normalized.includes("estudio") ||
    normalized.includes("produccion")
  ) {
    inferred.push("activity");
  }

  if (inferred.length === 0) {
    inferred.push("general");
  }

  if (inferred.some((category) => category !== "general")) {
    inferred.push("operations");
  }

  if (isRevenueKpi(kpiId, label)) {
    inferred.push("management");
  }

  return uniqueCategories(inferred);
}

function emptyKpiGroups(): OfficialKpiGroups {
  return {
    activity: [],
    appointments: [],
    capacity: [],
    financial: [],
    general: [],
    management: [],
    operations: [],
    professionals: [],
    quality: [],
    services: [],
  };
}

function buildKpiRecords(
  publishedRows: PublishedVersionRow[],
  kpiRows: KpiResultRow[],
) {
  const versionById = new Map(publishedRows.map((row) => [row.version_id, row]));

  return kpiRows.flatMap<OfficialKpiRecord>((kpi) => {
    const version = versionById.get(kpi.closing_version_id);

    if (!version) {
      return [];
    }

    const categories = categoriesForKpi(kpi.kpi_id, kpi.label);
    const value =
      kpi.status === "CALCULABLE" ? numberOrNull(kpi.value) : null;

    return [
      {
        branchId: version.branch_id,
        branchName: version.branch_name,
        businessLine: version.business_line,
        categories,
        closingVersionId: kpi.closing_version_id,
        formula: kpi.formula,
        kpiId: kpi.kpi_id,
        kpiLabel: kpi.label,
        lineName: lineNames[version.business_line],
        missingFields: stringArrayFromJson(kpi.missing_fields),
        period: dateToPeriod(version.period_month),
        primaryCategory: categories[0] ?? "general",
        requiredFields: stringArrayFromJson(kpi.required_fields),
        status: kpi.status,
        unit: kpi.unit,
        value,
      },
    ];
  });
}

function buildKpiGroups(kpis: OfficialKpiRecord[]) {
  const groups = emptyKpiGroups();

  for (const kpi of kpis) {
    for (const category of kpi.categories) {
      groups[category].push(kpi);
    }
  }

  return groups;
}

function buildTargetComparisons(
  publishedRows: PublishedVersionRow[],
  kpis: OfficialKpiRecord[],
  targetRows: TargetRow[],
  period: string | null,
) {
  const branchNameById = new Map(
    publishedRows.map((row) => [row.branch_id, row.branch_name]),
  );

  return targetRows.flatMap<OfficialTargetComparison>((target) => {
    const targetPeriod = dateToPeriod(target.period_month);

    if (targetPeriod !== period) {
      return [];
    }

    const matchingKpis = kpis.filter(
      (kpi) =>
        kpi.businessLine === target.business_line &&
        kpi.branchId === target.branch_id &&
        kpi.kpiId === target.kpi_id &&
        kpi.period === targetPeriod &&
        kpi.status === "CALCULABLE" &&
        kpi.value !== null,
    );
    const actualValue =
      target.unit === "ratio"
        ? averageValues(matchingKpis.map((kpi) => kpi.value))
        : sumValues(matchingKpis.map((kpi) => kpi.value));
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
}

function buildLineSummaries(
  publishedRows: PublishedVersionRow[],
  kpis: OfficialKpiRecord[],
  targetComparisons: OfficialTargetComparison[],
) {
  return officialBusinessLines.flatMap<OfficialLineSummary>((businessLine) => {
    const lineRows = publishedRows.filter(
      (row) => row.business_line === businessLine,
    );

    if (lineRows.length === 0) {
      return [];
    }

    const lineKpis = kpis.filter((kpi) => kpi.businessLine === businessLine);
    const revenueKpis = lineKpis.filter(
      (kpi) =>
        kpi.status === "CALCULABLE" &&
        kpi.value !== null &&
        isRevenueKpi(kpi.kpiId, kpi.kpiLabel),
    );
    const lineTargets = targetComparisons.filter(
      (comparison) =>
        comparison.businessLine === businessLine &&
        isRevenueKpi(comparison.kpiId, comparison.kpiLabel),
    );
    const revenueActual = sumValues(revenueKpis.map((kpi) => kpi.value));
    const revenueTarget = sumValues(lineTargets.map((target) => target.targetValue));
    const revenueCompliance =
      revenueActual !== null && revenueTarget !== null && revenueTarget > 0
        ? revenueActual / revenueTarget
        : null;

    return [
      {
        branchCount: new Set(lineRows.map((row) => row.branch_id)).size,
        businessLine,
        calculableKpis: lineKpis.filter(
          (kpi) => kpi.status === "CALCULABLE" && kpi.value !== null,
        ).length,
        lineName: lineNames[businessLine],
        notCalculableKpis: lineKpis.filter(
          (kpi) => kpi.status !== "CALCULABLE" || kpi.value === null,
        ).length,
        publishedClosings: lineRows.length,
        qualityScore: averageValues(
          lineRows.map((row) => numberOrNull(row.data_quality_score)),
        ),
        revenueActual,
        revenueCompliance,
        revenueTarget,
        status: targetStatus(revenueCompliance),
        totalKpis: lineKpis.length,
      },
    ];
  });
}

function buildBranchSummaries(
  publishedRows: PublishedVersionRow[],
  kpis: OfficialKpiRecord[],
) {
  return publishedRows.map<OfficialBranchSummary>((row) => {
    const branchKpis = kpis.filter(
      (kpi) =>
        kpi.businessLine === row.business_line &&
        kpi.branchId === row.branch_id &&
        kpi.period === dateToPeriod(row.period_month),
    );
    const calculableKpis = branchKpis.filter(
      (kpi) => kpi.status === "CALCULABLE" && kpi.value !== null,
    );
    const revenueKpis = calculableKpis.filter((kpi) =>
      isRevenueKpi(kpi.kpiId, kpi.kpiLabel),
    );
    const activityKpis = calculableKpis.filter(isActivityVolumeKpi);

    return {
      activityVolume: sumValues(activityKpis.map((kpi) => kpi.value)),
      branchId: row.branch_id,
      branchName: row.branch_name,
      businessLine: row.business_line,
      calculableKpis: calculableKpis.length,
      lineName: lineNames[row.business_line],
      notCalculableKpis: branchKpis.length - calculableKpis.length,
      publishedClosings: 1,
      qualityScore: numberOrNull(row.data_quality_score),
      revenueActual: sumValues(revenueKpis.map((kpi) => kpi.value)),
      totalKpis: branchKpis.length,
    };
  });
}

function buildDataQualitySummary(
  publishedRows: PublishedVersionRow[],
  kpis: OfficialKpiRecord[],
) {
  const calculableKpis = kpis.filter(
    (kpi) => kpi.status === "CALCULABLE" && kpi.value !== null,
  ).length;
  const notCalculableKpis = kpis.length - calculableKpis;
  const missingFields = [
    ...new Set(kpis.flatMap((kpi) => kpi.missingFields)),
  ].sort();

  return {
    averageScore: averageValues(
      publishedRows.map((row) => numberOrNull(row.data_quality_score)),
    ),
    calculableKpis,
    completeness: kpis.length > 0 ? calculableKpis / kpis.length : null,
    missingFieldCount: kpis.reduce(
      (total, kpi) => total + kpi.missingFields.length,
      0,
    ),
    missingFields,
    notCalculableKpis,
    publishedClosings: publishedRows.length,
    totalKpis: kpis.length,
  };
}

function buildLineage(publishedRows: PublishedVersionRow[]) {
  return publishedRows.map<OfficialLineageSummary>((row) => ({
    branchId: row.branch_id,
    branchName: row.branch_name,
    businessLine: row.business_line,
    closingVersionId: row.version_id,
    companyId: row.company_id,
    companyName: row.company_name,
    countryId: row.country_id,
    countryName: row.country_name,
    dataQualityScore: numberOrNull(row.data_quality_score),
    lineName: lineNames[row.business_line],
    period: dateToPeriod(row.period_month),
  }));
}

function buildOfficialInsights(
  publishedRows: PublishedVersionRow[],
  insightRows: InsightRow[],
  period: string | null,
) {
  const branchNameById = new Map(
    publishedRows.map((row) => [row.branch_id, row.branch_name]),
  );

  return insightRows
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
}

export function emptyOfficialExecutiveSnapshot(
  dataStatus: OfficialExecutiveSnapshot["dataStatus"],
  errorMessage?: string,
): OfficialExecutiveSnapshot {
  const dataQuality = {
    averageScore: null,
    calculableKpis: 0,
    completeness: null,
    missingFieldCount: 0,
    missingFields: [],
    notCalculableKpis: 0,
    publishedClosings: 0,
    totalKpis: 0,
  };

  return {
    branchSummaries: [],
    dataQuality,
    dataStatus,
    errorMessage,
    generatedAt: new Date().toISOString(),
    insights: [],
    kpiGroups: emptyKpiGroups(),
    kpis: [],
    lineage: [],
    lineSummaries: [],
    period: null,
    sourceTables: [...sourceTables],
    targetComparisons: [],
    totals: {
      approvedTargets: 0,
      calculableKpis: 0,
      dataCompleteness: null,
      notCalculableKpis: 0,
      officialInsights: 0,
      publishedClosings: 0,
      revenueActual: null,
      revenueCompliance: null,
      revenueTarget: null,
      totalKpis: 0,
    },
  };
}

export function buildOfficialExecutiveSnapshot(
  publishedRows: PublishedVersionRow[],
  kpiRows: KpiResultRow[],
  targetRows: TargetRow[],
  insightRows: InsightRow[],
  period: string | null,
): OfficialExecutiveSnapshot {
  const kpis = buildKpiRecords(publishedRows, kpiRows);
  const kpiGroups = buildKpiGroups(kpis);
  const targetComparisons = buildTargetComparisons(
    publishedRows,
    kpis,
    targetRows,
    period,
  );
  const lineSummaries = buildLineSummaries(
    publishedRows,
    kpis,
    targetComparisons,
  );
  const insights = buildOfficialInsights(publishedRows, insightRows, period);
  const revenueActual = sumValues(
    lineSummaries.map((summary) => summary.revenueActual),
  );
  const revenueTarget = sumValues(
    lineSummaries.map((summary) => summary.revenueTarget),
  );
  const dataQuality = buildDataQualitySummary(publishedRows, kpis);

  return {
    branchSummaries: buildBranchSummaries(publishedRows, kpis),
    dataQuality,
    dataStatus: publishedRows.length > 0 ? "available" : "no_data",
    generatedAt: new Date().toISOString(),
    insights,
    kpiGroups,
    kpis,
    lineage: buildLineage(publishedRows),
    lineSummaries,
    period,
    sourceTables: [...sourceTables],
    targetComparisons,
    totals: {
      approvedTargets: targetComparisons.length,
      calculableKpis: dataQuality.calculableKpis,
      dataCompleteness: dataQuality.completeness,
      notCalculableKpis: dataQuality.notCalculableKpis,
      officialInsights: insights.length,
      publishedClosings: publishedRows.length,
      revenueActual,
      revenueCompliance:
        revenueActual !== null && revenueTarget !== null && revenueTarget > 0
          ? revenueActual / revenueTarget
          : null,
      revenueTarget,
      totalKpis: dataQuality.totalKpis,
    },
  };
}

export function buildOfficialExecutiveSnapshotForTests({
  filter = {},
  insightRows = [],
  kpiRows = [],
  publishedRows = [],
  targetRows = [],
}: OfficialSnapshotTestInput) {
  const scopedRows = filterPublishedRowsForSnapshot(publishedRows, filter);
  const period = selectedPeriod(scopedRows, filter);
  const periodRows = scopedRows.filter(
    (row) => period !== null && dateToPeriod(row.period_month) === period,
  );
  const versionIds = new Set(periodRows.map((row) => row.version_id));
  const scopedKpiRows = kpiRows.filter((kpi) =>
    versionIds.has(kpi.closing_version_id),
  );
  const scopedTargetRows = targetRows.filter((target) =>
    periodRows.some(
      (row) =>
        row.business_line === target.business_line &&
        row.branch_id === target.branch_id,
    ),
  );
  const scopedInsightRows = insightRows.filter((insight) =>
    periodRows.some(
      (row) =>
        row.business_line === insight.business_line &&
        row.branch_id === insight.branch_id,
    ),
  );

  return buildOfficialExecutiveSnapshot(
    periodRows,
    scopedKpiRows,
    scopedTargetRows,
    scopedInsightRows,
    period,
  );
}
