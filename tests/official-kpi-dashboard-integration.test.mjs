import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildOfficialExecutiveSnapshotForTests } from "../lib/server/official-bi-snapshot.ts";

const publishedRows = [
  {
    branch_id: "branch-fisio-1",
    branch_name: "Escalon",
    business_line: "PHYSIOTHERAPY",
    company_id: "company-fisio",
    company_name: "Analiza Fisioterapia",
    country_id: "country-sv",
    country_name: "El Salvador",
    data_quality_score: 92,
    period_month: "2026-07-01",
    version_id: "version-fisio-july",
  },
  {
    branch_id: "branch-fisio-1",
    branch_name: "Escalon",
    business_line: "PHYSIOTHERAPY",
    company_id: "company-fisio",
    company_name: "Analiza Fisioterapia",
    country_id: "country-sv",
    country_name: "El Salvador",
    data_quality_score: 88,
    period_month: "2026-08-01",
    version_id: "version-fisio-august",
  },
  {
    branch_id: "branch-lab-1",
    branch_name: "Central",
    business_line: "LABORATORY",
    company_id: "company-lab",
    company_name: "Analiza Laboratorio",
    country_id: "country-sv",
    country_name: "El Salvador",
    data_quality_score: 95,
    period_month: "2026-08-01",
    version_id: "version-lab-august",
  },
];

const kpiRows = [
  {
    closing_version_id: "version-fisio-july",
    formula: "facturacion neta",
    kpi_id: "facturacion_neta",
    label: "Facturacion neta",
    missing_fields: [],
    required_fields: ["revenueTotal"],
    status: "CALCULABLE",
    unit: "currency",
    value: 70000,
  },
  {
    closing_version_id: "version-fisio-august",
    formula: "facturacion neta",
    kpi_id: "facturacion_neta",
    label: "Facturacion neta",
    missing_fields: [],
    required_fields: ["revenueTotal"],
    status: "CALCULABLE",
    unit: "currency",
    value: 100000,
  },
  {
    closing_version_id: "version-fisio-august",
    formula: "no-show / citas agendadas",
    kpi_id: "tasa_no_show",
    label: "Tasa de no-show",
    missing_fields: [],
    required_fields: ["noShowAppointments", "appointmentsScheduled"],
    status: "CALCULABLE",
    unit: "ratio",
    value: 0.08,
  },
  {
    closing_version_id: "version-fisio-august",
    formula: "horas atendidas / horas disponibles",
    kpi_id: "ocupacion_efectiva",
    label: "Ocupacion efectiva",
    missing_fields: ["availableHours"],
    required_fields: ["attendedHours", "availableHours"],
    status: "NOT_CALCULABLE",
    unit: "ratio",
    value: null,
  },
  {
    closing_version_id: "version-lab-august",
    formula: "pruebas procesadas",
    kpi_id: "pruebas_procesadas",
    label: "Pruebas procesadas",
    missing_fields: [],
    required_fields: ["testsProcessed"],
    status: "CALCULABLE",
    unit: "count",
    value: 3200,
  },
];

const targetRows = [
  {
    branch_id: "branch-fisio-1",
    business_line: "PHYSIOTHERAPY",
    kpi_id: "facturacion_neta",
    label: "Facturacion",
    period_month: "2026-07-01",
    target_value: 80000,
    unit: "currency",
  },
  {
    branch_id: "branch-fisio-1",
    business_line: "PHYSIOTHERAPY",
    kpi_id: "facturacion_neta",
    label: "Facturacion",
    period_month: "2026-08-01",
    target_value: 120000,
    unit: "currency",
  },
  {
    branch_id: "branch-fisio-1",
    business_line: "PHYSIOTHERAPY",
    kpi_id: "ocupacion_efectiva",
    label: "Ocupacion efectiva",
    period_month: "2026-08-01",
    target_value: 0.8,
    unit: "ratio",
  },
];

const insightRows = [
  {
    branch_id: "branch-fisio-1",
    business_line: "PHYSIOTHERAPY",
    impact: "Capacidad pendiente de revisar",
    kpi_id: "ocupacion_efectiva",
    message: "Falta disponibilidad horaria para calcular ocupacion efectiva.",
    period_month: "2026-08-01",
    recommended_action: "Completar horas disponibles antes del cierre ejecutivo.",
    severity: "media",
    title: "Capacidad incompleta",
  },
];

const latestSnapshot = buildOfficialExecutiveSnapshotForTests({
  insightRows,
  kpiRows,
  publishedRows,
  targetRows,
});

assert.equal(latestSnapshot.period, "2026-08");
assert.equal(latestSnapshot.totals.publishedClosings, 2);
assert.equal(latestSnapshot.totals.totalKpis, 4);
assert.equal(latestSnapshot.totals.calculableKpis, 3);
assert.equal(latestSnapshot.totals.notCalculableKpis, 1);
assert.equal(latestSnapshot.totals.revenueActual, 100000);
assert.equal(latestSnapshot.dataQuality.missingFields[0], "availableHours");
assert.ok(
  latestSnapshot.kpiGroups.appointments.some(
    (kpi) => kpi.kpiId === "tasa_no_show",
  ),
);
assert.ok(
  latestSnapshot.kpiGroups.capacity.some(
    (kpi) =>
      kpi.kpiId === "ocupacion_efectiva" &&
      kpi.status === "NOT_CALCULABLE" &&
      kpi.missingFields.includes("availableHours"),
  ),
);
assert.equal(latestSnapshot.targetComparisons.length, 2);
assert.equal(
  latestSnapshot.targetComparisons.find(
    (comparison) => comparison.kpiId === "ocupacion_efectiva",
  )?.status,
  "sin_resultado",
);

const julyFisioSnapshot = buildOfficialExecutiveSnapshotForTests({
  filter: {
    businessLineId: "business-line-fisioterapia",
    periodStart: "2026-07-01",
  },
  insightRows,
  kpiRows,
  publishedRows,
  targetRows,
});

assert.equal(julyFisioSnapshot.period, "2026-07");
assert.equal(julyFisioSnapshot.totals.publishedClosings, 1);
assert.equal(julyFisioSnapshot.totals.totalKpis, 1);
assert.equal(julyFisioSnapshot.totals.revenueActual, 70000);
assert.deepEqual(
  new Set(julyFisioSnapshot.kpis.map((kpi) => kpi.businessLine)),
  new Set(["PHYSIOTHERAPY"]),
);

const branchFilteredSnapshot = buildOfficialExecutiveSnapshotForTests({
  filter: {
    branchId: "branch-lab-1",
    periodStart: "2026-08-01",
  },
  insightRows,
  kpiRows,
  publishedRows,
  targetRows,
});

assert.equal(branchFilteredSnapshot.period, "2026-08");
assert.deepEqual(
  branchFilteredSnapshot.kpis.map((kpi) => kpi.kpiId),
  ["pruebas_procesadas"],
);
assert.equal(branchFilteredSnapshot.targetComparisons.length, 0);

const modulePage = readFileSync("app/protected/[module]/page.tsx", "utf8");
const officialDashboard = readFileSync(
  "components/official-executive-data-dashboard.tsx",
  "utf8",
);
const officialBi = readFileSync("lib/server/official-bi.ts", "utf8");

for (const mode of [
  "appointments",
  "capacity",
  "branches",
  "professionals",
  "services",
  "quality",
  "managers",
  "operations",
]) {
  assert.ok(
    modulePage.includes(`renderOfficialDataModule("${mode}"`),
    `Module page must route ${mode} to the official KPI dashboard outside demo.`,
  );
}

for (const [mode, line] of [
  ["laboratory", "business-line-laboratorio"],
  ["physiotherapy", "business-line-fisioterapia"],
  ["imaging", "business-line-imagenes"],
]) {
  assert.ok(
    modulePage.includes(`"${mode}",`) && modulePage.includes(`"${line}"`),
    `Module page must route ${mode} to its official business line outside demo.`,
  );
}

assert.ok(
  officialDashboard.includes("No calculable con la informacion disponible") &&
    officialDashboard.includes("Campos faltantes") &&
    officialDashboard.includes("KPIs oficiales del modulo"),
  "Official dashboard must expose pending KPI fields instead of treating missing data as zero.",
);
assert.ok(
  officialBi.includes("required_fields") &&
    officialBi.includes("missing_fields") &&
    officialBi.includes("status") &&
    !officialBi.includes("and status = 'CALCULABLE'"),
  "Official BI reads all KPI result statuses so every published KPI is visible.",
);
