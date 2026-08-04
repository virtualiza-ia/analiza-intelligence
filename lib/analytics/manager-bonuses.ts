import type {
  TrendChartOption,
  TrendInsight,
  TrendSeries,
} from "@/components/analytics-comparison-chart";
import type { BusinessLineSlug } from "@/lib/analytics/business-line-operations";
import {
  allBranchNetworkRecords,
  type BranchNetworkRecord,
} from "@/lib/analytics/branch-network";
import {
  formatCurrency,
  formatRate,
} from "@/lib/analytics/el-salvador-result-templates";

export type ManagerBonusStatus =
  | "Sobresaliente"
  | "Saludable"
  | "Precaucion"
  | "Critico"
  | "Sin datos suficientes";

export type BonusState =
  | "En calculo"
  | "Pendiente de datos"
  | "Proyectado"
  | "En revision"
  | "Observado"
  | "Aprobado"
  | "Retenido"
  | "Bloqueado"
  | "Pagado";

export type ManagerType =
  | "Gerente activo"
  | "Gerente interino"
  | "Sucursal nueva"
  | "Sucursal comparable";

export type GoalType =
  | "Rentabilidad"
  | "Productividad"
  | "Ocupacion"
  | "Calidad y SLA"
  | "Pacientes"
  | "Inventario"
  | "Continuidad"
  | "Datos";

export type ManagerScoreDimension = {
  id: string;
  label: string;
  score: number;
  weight: number;
  points: number;
  insight: string;
};

export type BonusBlockingCondition = {
  category: "Financiero" | "Operativo" | "Calidad" | "Personas" | "Datos";
  reason: string;
  evidence: string;
  date: string;
  reviewer: string;
  state: "Reduce" | "Retiene" | "Bloquea" | "Pendiente";
  correctivePlan: string;
  reevaluationDate: string;
};

export type BonusWaterfallStep = {
  label: string;
  amount: number;
  kind: "base" | "adjustment" | "final";
  note: string;
};

export type ManagerBonusRecord = {
  id: string;
  manager: string;
  branch: string;
  branchCode: string;
  line: "Laboratorio" | "Fisioterapia" | "Imagenes" | "Multiservicio";
  lineSlug: BusinessLineSlug;
  country: string;
  region: string;
  managerType: ManagerType;
  goalType: GoalType;
  startDate: string;
  score: number;
  scoreDelta: number;
  status: ManagerBonusStatus;
  targetCompletionRate: number;
  netSales: number;
  growthRate: number;
  marginRate: number;
  utility: number;
  occupancyRate: number;
  slaRate: number;
  patientSatisfaction: number;
  dataQuality: number;
  staffTurnoverRate: number;
  criticalIncidents: number;
  bonusPotential: number;
  bonusProjected: number;
  bonusApproved: number;
  bonusRetained: number;
  bonusBlocked: number;
  bonusPaid: number;
  bonusState: BonusState;
  scoreMultiplier: number;
  fulfillmentFactor: number;
  qualityFactor: number;
  principalStrength: string;
  principalGap: string;
  recommendedAction: string;
  explanation: string;
  dimensions: ManagerScoreDimension[];
  blockingConditions: BonusBlockingCondition[];
  waterfall: BonusWaterfallStep[];
  reductionCauses: { cause: string; amount: number; count: number }[];
  trend: {
    totalScore: number[];
    financialScore: number[];
    operationalScore: number[];
    qualityScore: number[];
    projectedBonus: number[];
  };
};

export type ManagerBonusMetric = {
  group: "Gerentes" | "Bonos" | "Gestion";
  label: string;
  value: string;
  note: string;
  tone: "positive" | "warning" | "negative" | "neutral";
};

export type ManagerBonusScreen = {
  slug: BusinessLineSlug;
  title: string;
  subtitle: string;
  description: string;
  rule: string;
  weights: { dimension: string; weight: number }[];
  metrics: ManagerBonusMetric[];
  records: ManagerBonusRecord[];
  executiveInsights: string[];
};

const exactDateLabels = [
  "01/07/2026",
  "05/07/2026",
  "10/07/2026",
  "15/07/2026",
  "20/07/2026",
  "25/07/2026",
  "31/07/2026",
];

const trendColors: TrendSeries["color"][] = [
  "blue",
  "orange",
  "teal",
  "green",
  "rose",
];

export const managerBonusWeightsByLine: Record<
  BusinessLineSlug,
  { dimension: string; weight: number }[]
> = {
  consolidado: [
    { dimension: "Resultado financiero", weight: 30 },
    { dimension: "Operacion y productividad", weight: 20 },
    { dimension: "Capacidad y ocupacion", weight: 15 },
    { dimension: "Pacientes y crecimiento", weight: 10 },
    { dimension: "Calidad y SLA", weight: 10 },
    { dimension: "Gestion de personas", weight: 10 },
    { dimension: "Calidad de datos y cumplimiento", weight: 5 },
  ],
  laboratorio: [
    { dimension: "Finanzas", weight: 30 },
    { dimension: "Operacion y SLA", weight: 25 },
    { dimension: "Pacientes y canal medico", weight: 15 },
    { dimension: "Inventario", weight: 15 },
    { dimension: "Personas", weight: 10 },
    { dimension: "Datos y cumplimiento", weight: 5 },
  ],
  fisioterapia: [
    { dimension: "Finanzas", weight: 25 },
    { dimension: "Ocupacion efectiva", weight: 20 },
    { dimension: "Continuidad terapeutica", weight: 20 },
    { dimension: "Pacientes y crecimiento", weight: 10 },
    { dimension: "Calidad y experiencia", weight: 10 },
    { dimension: "Gestion de personas", weight: 10 },
    { dimension: "Datos", weight: 5 },
  ],
  imagenes: [
    { dimension: "Finanzas", weight: 25 },
    { dimension: "Utilizacion y produccion", weight: 20 },
    { dimension: "Disponibilidad tecnica", weight: 15 },
    { dimension: "Informes y SLA", weight: 20 },
    { dimension: "Calidad y experiencia", weight: 10 },
    { dimension: "Personas", weight: 5 },
    { dimension: "Datos", weight: 5 },
  ],
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getManagerStatus(score: number, dataQuality: number): ManagerBonusStatus {
  if (dataQuality < 72) {
    return "Sin datos suficientes";
  }

  if (score >= 90) {
    return "Sobresaliente";
  }

  if (score >= 80) {
    return "Saludable";
  }

  if (score >= 70) {
    return "Precaucion";
  }

  return "Critico";
}

function getScoreMultiplier(score: number) {
  if (score < 70) {
    return 0;
  }

  if (score < 80) {
    return 0.5;
  }

  if (score < 90) {
    return 0.8;
  }

  if (score < 100) {
    return 1;
  }

  return 1.1;
}

function getDimensionByLabel(dimensions: ManagerScoreDimension[], pattern: RegExp) {
  return dimensions.find((dimension) => pattern.test(dimension.label))?.score ?? 0;
}

function buildTrendPoints(value: number, delta: number, min = 0, max = 100) {
  const base = clamp(value - delta - 5, min, max);
  return [base, base + 2, base + 4, value - 2, value - 1, value + 1, value].map(
    (point) => Math.round(clamp(point, min, max)),
  );
}

function buildBonusTrend(value: number) {
  const safeValue = Math.max(0, value);
  return [0.72, 0.76, 0.81, 0.86, 0.91, 0.96, 1].map((factor) =>
    Math.round(safeValue * factor),
  );
}

function buildBlockingConditions(
  record: BranchNetworkRecord,
  index: number,
): BonusBlockingCondition[] {
  const conditions: BonusBlockingCondition[] = [];

  if (record.utility < 8500 || record.targetGap < -10) {
    conditions.push({
      category: "Financiero",
      reason: "Utilidad o meta por debajo del umbral",
      evidence: `${record.city}: ${formatCurrency(record.utility)} de utilidad y brecha ${record.targetGap} pts`,
      date: "2026-07-21",
      reviewer: "Direccion financiera",
      state: record.utility < 6500 ? "Bloquea" : "Retiene",
      correctivePlan: "Validar costo operativo, mix de servicios y plan de recuperacion de meta.",
      reevaluationDate: "2026-08-05",
    });
  }

  if (record.marginRate < 0.84) {
    conditions.push({
      category: "Financiero",
      reason: "Margen por debajo del minimo definido",
      evidence: `${formatRate(record.marginRate)} de margen contra umbral operativo`,
      date: "2026-07-21",
      reviewer: "Finanzas",
      state: "Reduce",
      correctivePlan: "Revisar descuentos, reactivos, tercerizaciones o margen por modalidad.",
      reevaluationDate: "2026-08-05",
    });
  }

  if (record.slaRate < 0.82) {
    conditions.push({
      category: "Operativo",
      reason: "SLA operativo debajo de meta",
      evidence: `${formatRate(record.slaRate)} de cumplimiento SLA`,
      date: "2026-07-20",
      reviewer: "Gerencia de operaciones",
      state: "Retiene",
      correctivePlan: "Corregir cuellos de botella y responsables de cierre diario.",
      reevaluationDate: "2026-07-31",
    });
  }

  if (record.dataQuality < 80 || record.alerts.length > 1) {
    conditions.push({
      category: "Datos",
      reason: "Calidad de datos o evidencia incompleta",
      evidence: record.alerts[0] ?? `${record.dataQuality} puntos de calidad de datos`,
      date: "2026-07-22",
      reviewer: "Auditoria de datos",
      state: record.dataQuality < 76 ? "Bloquea" : "Pendiente",
      correctivePlan: "Completar plantilla, corregir periodo y dejar trazabilidad de ajustes.",
      reevaluationDate: "2026-07-29",
    });
  }

  if (record.lineSlug === "laboratorio" && record.dataQuality < 82) {
    conditions.push({
      category: "Calidad",
      reason: "Inventario, reactivos o muestras requieren validacion",
      evidence: "Plantilla indica validaciones pendientes de YTD, proyeccion o filas maximas.",
      date: "2026-07-22",
      reviewer: "Calidad laboratorio",
      state: index % 2 === 0 ? "Retiene" : "Reduce",
      correctivePlan: "Conciliar inventario, vencimientos y ordenes sin facturar.",
      reevaluationDate: "2026-08-03",
    });
  }

  if (record.lineSlug === "fisioterapia" && record.occupancyRate < 0.72) {
    conditions.push({
      category: "Operativo",
      reason: "Ocupacion efectiva baja frente a demanda agendada",
      evidence: `${formatRate(record.occupancyRate)} de ocupacion efectiva`,
      date: "2026-07-19",
      reviewer: "Direccion fisioterapia",
      state: "Reduce",
      correctivePlan: "Reducir no-show, recuperar espacios y fortalecer continuidad terapeutica.",
      reevaluationDate: "2026-07-31",
    });
  }

  if (record.lineSlug === "imagenes" && record.slaRate < 0.84) {
    conditions.push({
      category: "Operativo",
      reason: "Informes o disponibilidad tecnica fuera de meta",
      evidence: `${formatRate(record.slaRate)} de SLA y riesgo de informes pendientes`,
      date: "2026-07-18",
      reviewer: "Direccion imagenes",
      state: "Retiene",
      correctivePlan: "Escalar mantenimiento, lecturas pendientes y agenda por modalidad.",
      reevaluationDate: "2026-07-30",
    });
  }

  if (index % 5 === 2) {
    conditions.push({
      category: "Personas",
      reason: "Rotacion o ausentismo en seguimiento",
      evidence: "Vacante critica o cobertura parcial del equipo durante el periodo.",
      date: "2026-07-17",
      reviewer: "Recursos Humanos",
      state: "Reduce",
      correctivePlan: "Documentar cobertura, refuerzo temporal y plan de retencion.",
      reevaluationDate: "2026-08-02",
    });
  }

  return conditions;
}

function buildDimensions(
  record: BranchNetworkRecord,
  index: number,
): ManagerScoreDimension[] {
  const financialScore = Math.round(
    clamp(
      record.revenueShare > 0
        ? record.targetGap + 100 + (record.marginRate - 0.84) * 80
        : record.targetGap + 90,
      48,
      108,
    ),
  );
  const operationalScore = Math.round(
    clamp(record.operatingScore + (record.slaRate - 0.84) * 18, 45, 102),
  );
  const occupancyScore = Math.round(clamp(record.occupancyRate * 100, 45, 100));
  const patientScore = Math.round(
    clamp(82 + record.growthRate * 110 + (record.recurrenceRate - 0.5) * 32, 48, 108),
  );
  const qualityScore = Math.round(
    clamp(record.slaRate * 72 + record.dataQuality * 0.28, 45, 100),
  );
  const peopleScore = Math.round(
    clamp(87 - index * 2 - (record.scoreDelta < 0 ? 6 : 0), 54, 96),
  );
  const dataScore = Math.round(clamp(record.dataQuality, 45, 100));
  const inventoryScore = Math.round(
    clamp(92 - record.incidenceShare * 0.9 - (record.dataQuality < 80 ? 8 : 0), 48, 98),
  );
  const continuityScore = Math.round(
    clamp(record.recurrenceRate * 82 + record.occupancyRate * 28, 48, 100),
  );
  const equipmentScore = Math.round(
    clamp(record.occupancyRate * 72 + record.slaRate * 26, 48, 100),
  );

  const source: Record<BusinessLineSlug, Omit<ManagerScoreDimension, "points">[]> = {
    consolidado: [
      {
        id: "financial",
        label: "Resultado financiero",
        score: financialScore,
        weight: 30,
        insight: "Venta, utilidad, margen y cumplimiento de meta.",
      },
      {
        id: "operation",
        label: "Operacion y productividad",
        score: operationalScore,
        weight: 20,
        insight: "Volumen, productividad y proceso operativo.",
      },
      {
        id: "occupancy",
        label: "Capacidad y ocupacion",
        score: occupancyScore,
        weight: 15,
        insight: "Uso efectivo de recursos disponibles.",
      },
      {
        id: "patients",
        label: "Pacientes y crecimiento",
        score: patientScore,
        weight: 10,
        insight: "Crecimiento, recurrencia y flujo de pacientes.",
      },
      {
        id: "quality",
        label: "Calidad y SLA",
        score: qualityScore,
        weight: 10,
        insight: "SLA, experiencia y reclamos.",
      },
      {
        id: "people",
        label: "Gestion de personas",
        score: peopleScore,
        weight: 10,
        insight: "Rotacion, ausentismo, cobertura y equipo.",
      },
      {
        id: "data",
        label: "Calidad de datos y cumplimiento",
        score: dataScore,
        weight: 5,
        insight: "Plantillas, evidencia, auditoria y cierre.",
      },
    ],
    laboratorio: [
      {
        id: "financial",
        label: "Finanzas",
        score: financialScore,
        weight: 30,
        insight: "Venta, margen, costo por orden, utilidad y compras urgentes.",
      },
      {
        id: "operation",
        label: "Operacion y SLA",
        score: operationalScore,
        weight: 25,
        insight: "Ordenes, muestras, resultados, pendientes y SLA.",
      },
      {
        id: "patients",
        label: "Pacientes y canal medico",
        score: patientScore,
        weight: 15,
        insight: "Pacientes, medicos activos, ticket y conversion.",
      },
      {
        id: "inventory",
        label: "Inventario",
        score: inventoryScore,
        weight: 15,
        insight: "Reactivos, vencimientos, diferencias y rendimiento esperado.",
      },
      {
        id: "people",
        label: "Personas",
        score: peopleScore,
        weight: 10,
        insight: "Cobertura tecnica, rotacion, ausentismo y turnos.",
      },
      {
        id: "data",
        label: "Datos y cumplimiento",
        score: dataScore,
        weight: 5,
        insight: "Plantillas, auditoria, protocolos y evidencia.",
      },
    ],
    fisioterapia: [
      {
        id: "financial",
        label: "Finanzas",
        score: financialScore,
        weight: 25,
        insight: "Venta, margen por sesion, utilidad y no-show monetizado.",
      },
      {
        id: "occupancy",
        label: "Ocupacion efectiva",
        score: occupancyScore,
        weight: 20,
        insight: "Horas atendidas contra horas disponibles.",
      },
      {
        id: "continuity",
        label: "Continuidad terapeutica",
        score: continuityScore,
        weight: 20,
        insight: "Planes iniciados, completados, abandono y recurrencia.",
      },
      {
        id: "patients",
        label: "Pacientes y crecimiento",
        score: patientScore,
        weight: 10,
        insight: "Pacientes nuevos, recurrentes y frecuencia.",
      },
      {
        id: "quality",
        label: "Calidad y experiencia",
        score: qualityScore,
        weight: 10,
        insight: "Satisfaccion, reclamos y tiempo de espera.",
      },
      {
        id: "people",
        label: "Gestion de personas",
        score: peopleScore,
        weight: 10,
        insight: "Productividad por fisioterapeuta, rotacion y carga.",
      },
      {
        id: "data",
        label: "Datos",
        score: dataScore,
        weight: 5,
        insight: "Estados de citas, evidencia y cargas a tiempo.",
      },
    ],
    imagenes: [
      {
        id: "financial",
        label: "Finanzas",
        score: financialScore,
        weight: 25,
        insight: "Venta, margen por modalidad, utilidad y estudios sin facturar.",
      },
      {
        id: "operation",
        label: "Utilizacion y produccion",
        score: operationalScore,
        weight: 20,
        insight: "Estudios realizados, productividad y repeticiones.",
      },
      {
        id: "equipment",
        label: "Disponibilidad tecnica",
        score: equipmentScore,
        weight: 15,
        insight: "Disponibilidad de equipo, mantenimiento y tiempo muerto.",
      },
      {
        id: "quality",
        label: "Informes y SLA",
        score: qualityScore,
        weight: 20,
        insight: "Informes pendientes, entregados y dentro de SLA.",
      },
      {
        id: "experience",
        label: "Calidad y experiencia",
        score: Math.round(clamp((qualityScore + patientScore) / 2, 45, 100)),
        weight: 10,
        insight: "Reclamos, preparacion, espera y entrega.",
      },
      {
        id: "people",
        label: "Personas",
        score: peopleScore,
        weight: 5,
        insight: "Tecnicos, lectura, ausentismo y cobertura de turnos.",
      },
      {
        id: "data",
        label: "Datos",
        score: dataScore,
        weight: 5,
        insight: "RIS/PACS, evidencia y trazabilidad.",
      },
    ],
  };

  return source[record.lineSlug].map((dimension) => ({
    ...dimension,
    points: Number(((dimension.score * dimension.weight) / 100).toFixed(1)),
  }));
}

function getGoalType(record: BranchNetworkRecord, dimensions: ManagerScoreDimension[]): GoalType {
  const lowestDimension = dimensions.reduce((lowest, dimension) =>
    dimension.score < lowest.score ? dimension : lowest,
  );

  if (record.lineSlug === "laboratorio" && /Inventario/i.test(lowestDimension.label)) {
    return "Inventario";
  }

  if (record.lineSlug === "fisioterapia" && /Continuidad/i.test(lowestDimension.label)) {
    return "Continuidad";
  }

  if (/Ocupacion|Disponibilidad|Utilizacion/i.test(lowestDimension.label)) {
    return "Ocupacion";
  }

  if (/Calidad|SLA|Informes/i.test(lowestDimension.label)) {
    return "Calidad y SLA";
  }

  if (/Pacientes/i.test(lowestDimension.label)) {
    return "Pacientes";
  }

  if (/Datos/i.test(lowestDimension.label)) {
    return "Datos";
  }

  if (/Operacion|Productividad/i.test(lowestDimension.label)) {
    return "Productividad";
  }

  return "Rentabilidad";
}

function getManagerType(record: BranchNetworkRecord, index: number): ManagerType {
  if (record.lineSlug !== "laboratorio" && index % 4 === 1) {
    return "Sucursal nueva";
  }

  if (index % 6 === 4) {
    return "Gerente interino";
  }

  if (record.size === "Pequena") {
    return "Sucursal comparable";
  }

  return "Gerente activo";
}

function getBonusState(
  score: number,
  dataQuality: number,
  conditions: BonusBlockingCondition[],
): BonusState {
  if (dataQuality < 72) {
    return "Pendiente de datos";
  }

  if (score < 70 || conditions.some((condition) => condition.state === "Bloquea")) {
    return "Bloqueado";
  }

  if (conditions.some((condition) => condition.state === "Retiene")) {
    return "Retenido";
  }

  if (conditions.some((condition) => condition.state === "Pendiente")) {
    return "Observado";
  }

  if (score >= 92) {
    return "Aprobado";
  }

  if (score >= 86) {
    return "En revision";
  }

  return "Proyectado";
}

function buildWaterfall(
  bonusPotential: number,
  scoreMultiplier: number,
  fulfillmentFactor: number,
  qualityFactor: number,
  penalties: number,
) {
  const scoreAdjusted = Math.round(bonusPotential * scoreMultiplier);
  const fulfillmentAdjusted = Math.round(scoreAdjusted * fulfillmentFactor);
  const qualityAdjusted = Math.round(fulfillmentAdjusted * qualityFactor);
  const projected = Math.max(0, qualityAdjusted - penalties);

  return {
    projected,
    waterfall: [
      {
        label: "Bono potencial",
        amount: bonusPotential,
        kind: "base" as const,
        note: "Monto base segun nivel y sucursal.",
      },
      {
        label: "Multiplicador score",
        amount: scoreAdjusted - bonusPotential,
        kind: "adjustment" as const,
        note: `Multiplicador ${(scoreMultiplier * 100).toFixed(0)}%.`,
      },
      {
        label: "Cumplimiento",
        amount: fulfillmentAdjusted - scoreAdjusted,
        kind: "adjustment" as const,
        note: `Factor ${(fulfillmentFactor * 100).toFixed(0)}%.`,
      },
      {
        label: "Calidad y datos",
        amount: qualityAdjusted - fulfillmentAdjusted,
        kind: "adjustment" as const,
        note: `Factor ${(qualityFactor * 100).toFixed(0)}%.`,
      },
      {
        label: "Penalizaciones",
        amount: -penalties,
        kind: "adjustment" as const,
        note: "Bloqueos, retenciones y reducciones.",
      },
      {
        label: "Bono proyectado",
        amount: projected,
        kind: "final" as const,
        note: "Resultado antes de aprobacion final.",
      },
    ],
  };
}

function buildReductionCauses(
  record: BranchNetworkRecord,
  conditions: BonusBlockingCondition[],
  penalties: number,
) {
  const causes = [
    {
      cause: "Utilidad bajo meta",
      amount: Math.max(0, Math.round((1 - (1 + record.targetGap / 100)) * 600)),
      count: record.targetGap < 0 ? 1 : 0,
    },
    {
      cause: "Margen bajo",
      amount: Math.max(0, Math.round((0.86 - record.marginRate) * 1400)),
      count: record.marginRate < 0.86 ? 1 : 0,
    },
    {
      cause: "SLA",
      amount: Math.max(0, Math.round((0.9 - record.slaRate) * 900)),
      count: record.slaRate < 0.9 ? 1 : 0,
    },
    {
      cause: "Calidad de datos",
      amount: Math.max(0, Math.round((85 - record.dataQuality) * 18)),
      count: record.dataQuality < 85 ? 1 : 0,
    },
    {
      cause: record.lineSlug === "laboratorio" ? "Inventario" : record.lineSlug === "imagenes" ? "Informes" : "No-show",
      amount: Math.max(0, Math.round(penalties * 0.36)),
      count: conditions.length > 0 ? 1 : 0,
    },
    {
      cause: "Rotacion",
      amount: conditions.some((condition) => condition.category === "Personas") ? 120 : 0,
      count: conditions.some((condition) => condition.category === "Personas") ? 1 : 0,
    },
  ];

  return causes
    .filter((cause) => cause.amount > 0 || cause.count > 0)
    .sort((a, b) => b.amount - a.amount);
}

function getLineSpecificExplanation(record: BranchNetworkRecord) {
  if (record.lineSlug === "laboratorio") {
    return "El score de laboratorio pondera ordenes, muestras, SLA, inventario, reactivos, medicos, margen y datos.";
  }

  if (record.lineSlug === "fisioterapia") {
    return "El score de fisioterapia evita premiar solo agenda llena: revisa ocupacion efectiva, continuidad terapeutica y no-show.";
  }

  if (record.lineSlug === "imagenes") {
    return "El score de imagenes incorpora utilizacion, disponibilidad tecnica, informes, repeticiones y estudios sin facturar.";
  }

  return "El score multiservicio separa cada linea para que una fortaleza no oculte una falla critica.";
}

function buildManagerBonusRecord(
  record: BranchNetworkRecord,
  index: number,
): ManagerBonusRecord {
  const dimensions = buildDimensions(record, index);
  const score = Math.round(
    dimensions.reduce((sum, dimension) => sum + dimension.points, 0),
  );
  const conditions = buildBlockingConditions(record, index);
  const scoreMultiplier = getScoreMultiplier(score);
  const targetCompletionRate = clamp(1 + record.targetGap / 100, 0.5, 1.2);
  const fulfillmentFactor = clamp(targetCompletionRate, 0.72, 1.08);
  const qualityFactor = clamp(record.dataQuality / 100 + (record.slaRate >= 0.9 ? 0.08 : 0), 0.72, 1.05);
  const bonusPotential = Math.round(
    (record.size === "Grande" ? 1250 : record.size === "Mediana" ? 950 : 750) +
      record.netSales * 0.004,
  );
  const penalties =
    conditions.filter((condition) => condition.state === "Bloquea").length * 240 +
    conditions.filter((condition) => condition.state === "Retiene").length * 160 +
    conditions.filter((condition) => condition.state === "Reduce").length * 90 +
    conditions.filter((condition) => condition.state === "Pendiente").length * 70;
  const { projected, waterfall } = buildWaterfall(
    bonusPotential,
    scoreMultiplier,
    fulfillmentFactor,
    qualityFactor,
    penalties,
  );
  const bonusState = getBonusState(score, record.dataQuality, conditions);
  const bonusApproved =
    bonusState === "Aprobado" || bonusState === "Pagado"
      ? Math.round(projected * 0.98)
      : 0;
  const bonusPaid = bonusState === "Pagado" ? bonusApproved : 0;
  const financialScore = getDimensionByLabel(dimensions, /Finanzas|Resultado financiero/);
  const operationalScore = getDimensionByLabel(
    dimensions,
    /Operacion|Productividad|Utilizacion/,
  );
  const qualityScore = getDimensionByLabel(dimensions, /Calidad|SLA|Informes/);
  const lowestDimension = dimensions.reduce((lowest, dimension) =>
    dimension.score < lowest.score ? dimension : lowest,
  );
  const highestDimension = dimensions.reduce((highest, dimension) =>
    dimension.score > highest.score ? dimension : highest,
  );

  return {
    id: `manager-${record.id}`,
    manager: record.manager,
    branch: record.branch,
    branchCode: record.id,
    line: record.line,
    lineSlug: record.lineSlug,
    country: "El Salvador",
    region: record.region,
    managerType: getManagerType(record, index),
    goalType: getGoalType(record, dimensions),
    startDate: index % 3 === 0 ? "2024-02-01" : index % 3 === 1 ? "2025-05-15" : "2023-09-01",
    score,
    scoreDelta: record.scoreDelta,
    status: getManagerStatus(score, record.dataQuality),
    targetCompletionRate,
    netSales: record.netSales,
    growthRate: record.growthRate,
    marginRate: record.marginRate,
    utility: record.utility,
    occupancyRate: record.occupancyRate,
    slaRate: record.slaRate,
    patientSatisfaction: Math.round(clamp(82 + record.slaRate * 10 - index, 62, 96)),
    dataQuality: record.dataQuality,
    staffTurnoverRate: clamp(0.04 + index * 0.008 + (record.scoreDelta < 0 ? 0.025 : 0), 0.03, 0.18),
    criticalIncidents: conditions.filter((condition) =>
      ["Bloquea", "Retiene"].includes(condition.state),
    ).length,
    bonusPotential,
    bonusProjected: projected,
    bonusApproved,
    bonusRetained: bonusState === "Retenido" ? projected : 0,
    bonusBlocked: bonusState === "Bloqueado" ? projected : 0,
    bonusPaid,
    bonusState,
    scoreMultiplier,
    fulfillmentFactor,
    qualityFactor,
    principalStrength: `${highestDimension.label}: ${highestDimension.score}`,
    principalGap: `${lowestDimension.label}: ${lowestDimension.score}`,
    recommendedAction:
      record.lineSlug === "laboratorio"
        ? "Conciliar margen, inventario, reactivos y ordenes sin facturar antes de aprobar bono."
        : record.lineSlug === "fisioterapia"
          ? "Convertir agenda en sesiones atendidas, recuperar no-show y proteger continuidad terapeutica."
          : record.lineSlug === "imagenes"
            ? "Cerrar informes pendientes, disponibilidad tecnica y agenda por modalidad."
            : "Separar causa operacional, financiera y de datos antes de decidir bono.",
    explanation: `${record.manager} obtuvo ${score} puntos. ${highestDimension.insight} fue la principal fortaleza; pierde puntos por ${lowestDimension.label.toLowerCase()}. ${getLineSpecificExplanation(record)}`,
    dimensions,
    blockingConditions: conditions,
    waterfall,
    reductionCauses: buildReductionCauses(record, conditions, penalties),
    trend: {
      totalScore: buildTrendPoints(score, record.scoreDelta),
      financialScore: buildTrendPoints(financialScore, record.scoreDelta),
      operationalScore: buildTrendPoints(operationalScore, record.scoreDelta),
      qualityScore: buildTrendPoints(qualityScore, record.scoreDelta),
      projectedBonus: buildBonusTrend(projected),
    },
  };
}

export const allManagerBonusRecords: ManagerBonusRecord[] =
  allBranchNetworkRecords.map(buildManagerBonusRecord);

function buildMetrics(records: ManagerBonusRecord[]): ManagerBonusMetric[] {
  const active = records.length;
  const evaluated = records.filter((record) => record.status !== "Sin datos suficientes").length;
  const pending = active - evaluated;
  const aboveTarget = records.filter((record) => record.targetCompletionRate >= 1).length;
  const warning = records.filter((record) => record.status === "Precaucion").length;
  const critical = records.filter((record) =>
    ["Critico", "Sin datos suficientes"].includes(record.status),
  ).length;
  const projectedManagers = records.filter((record) =>
    ["Proyectado", "En revision", "Aprobado", "Retenido", "Bloqueado"].includes(
      record.bonusState,
    ),
  ).length;
  const blockedManagers = records.filter((record) => record.bonusState === "Bloqueado").length;
  const totalFund = records.reduce((sum, record) => sum + record.bonusPotential, 0);
  const totalProjected = records.reduce((sum, record) => sum + record.bonusProjected, 0);
  const totalApproved = records.reduce((sum, record) => sum + record.bonusApproved, 0);
  const totalRetained = records.reduce((sum, record) => sum + record.bonusRetained, 0);
  const totalBlocked = records.reduce((sum, record) => sum + record.bonusBlocked, 0);
  const totalPaid = records.reduce((sum, record) => sum + record.bonusPaid, 0);
  const averageScore =
    records.reduce((sum, record) => sum + record.score, 0) / Math.max(active, 1);
  const managedSales = records.reduce((sum, record) => sum + record.netSales, 0);
  const managedUtility = records.reduce((sum, record) => sum + record.utility, 0);
  const averageMargin =
    records.reduce((sum, record) => sum + record.marginRate, 0) / Math.max(active, 1);
  const averageOccupancy =
    records.reduce((sum, record) => sum + record.occupancyRate, 0) / Math.max(active, 1);
  const averageSla =
    records.reduce((sum, record) => sum + record.slaRate, 0) / Math.max(active, 1);
  const averageDataQuality =
    records.reduce((sum, record) => sum + record.dataQuality, 0) / Math.max(active, 1);
  const averageBonus = totalProjected / Math.max(projectedManagers, 1);
  const bonusCostOnUtility = totalProjected / Math.max(managedUtility, 1);
  const bonusRoi = managedUtility / Math.max(totalProjected, 1);

  return [
    { group: "Gerentes", label: "Gerentes activos", value: `${active}`, note: "en la vista filtrada", tone: "neutral" },
    { group: "Gerentes", label: "Gerentes evaluados", value: `${evaluated}`, note: "con datos suficientes", tone: pending > 0 ? "warning" : "positive" },
    { group: "Gerentes", label: "Pendientes de evaluacion", value: `${pending}`, note: "faltan datos o cierre", tone: pending > 0 ? "warning" : "positive" },
    { group: "Gerentes", label: "Gerentes sobre meta", value: `${aboveTarget}`, note: "cumplimiento >= 100%", tone: "positive" },
    { group: "Gerentes", label: "En precaucion", value: `${warning}`, note: "requieren accion", tone: warning > 0 ? "warning" : "positive" },
    { group: "Gerentes", label: "Criticos o sin datos", value: `${critical}`, note: "riesgo de bono", tone: critical > 0 ? "negative" : "positive" },
    { group: "Bonos", label: "Fondo total de bonos", value: formatCurrency(totalFund), note: "bono potencial", tone: "neutral" },
    { group: "Bonos", label: "Bono proyectado", value: formatCurrency(totalProjected), note: `${projectedManagers} gerentes con calculo`, tone: "positive" },
    { group: "Bonos", label: "Bono aprobado", value: formatCurrency(totalApproved), note: "validado por revision", tone: totalApproved > 0 ? "positive" : "warning" },
    { group: "Bonos", label: "Bono retenido", value: formatCurrency(totalRetained), note: "requiere evidencia", tone: totalRetained > 0 ? "warning" : "positive" },
    { group: "Bonos", label: "Bono bloqueado", value: formatCurrency(totalBlocked), note: `${blockedManagers} bloqueos`, tone: totalBlocked > 0 ? "negative" : "positive" },
    { group: "Bonos", label: "Bono promedio", value: formatCurrency(averageBonus), note: "por gerente con bono", tone: "neutral" },
    { group: "Gestion", label: "Score gerencial promedio", value: `${Math.round(averageScore)}`, note: "0 a 100 ponderado", tone: averageScore >= 80 ? "positive" : "warning" },
    { group: "Gestion", label: "Venta gestionada", value: formatCurrency(managedSales), note: "no sustituye salud financiera", tone: "neutral" },
    { group: "Gestion", label: "Utilidad gestionada", value: formatCurrency(managedUtility), note: "base de retorno", tone: managedUtility > 0 ? "positive" : "negative" },
    { group: "Gestion", label: "Margen promedio", value: formatRate(averageMargin), note: "ponderado simple DEMO", tone: averageMargin >= 0.84 ? "positive" : "warning" },
    { group: "Gestion", label: "Ocupacion efectiva", value: formatRate(averageOccupancy), note: "capacidad utilizada", tone: averageOccupancy >= 0.78 ? "positive" : "warning" },
    { group: "Gestion", label: "Cumplimiento SLA", value: formatRate(averageSla), note: "calidad operativa", tone: averageSla >= 0.86 ? "positive" : "warning" },
    { group: "Gestion", label: "Calidad de datos", value: `${Math.round(averageDataQuality)}`, note: "habilita aprobacion", tone: averageDataQuality >= 82 ? "positive" : "warning" },
    { group: "Gestion", label: "Costo bono / utilidad", value: formatRate(bonusCostOnUtility), note: "peso del incentivo", tone: bonusCostOnUtility <= 0.12 ? "positive" : "warning" },
    { group: "Gestion", label: "Retorno por $1 bono", value: `$${bonusRoi.toFixed(1)}`, note: "utilidad por dolar incentivado", tone: bonusRoi >= 8 ? "positive" : "warning" },
    { group: "Bonos", label: "Bono pagado", value: formatCurrency(totalPaid), note: "estado final", tone: "neutral" },
  ];
}

export function getManagerBonusScreen(slug: BusinessLineSlug): ManagerBonusScreen {
  const records =
    slug === "consolidado"
      ? allManagerBonusRecords
      : allManagerBonusRecords.filter((record) => record.lineSlug === slug);
  const titles: Record<BusinessLineSlug, Pick<ManagerBonusScreen, "title" | "subtitle" | "description">> = {
    consolidado: {
      title: "Gerentes y bonos",
      subtitle: "Vitrina ejecutiva del calculo gerencial",
      description:
        "Muestra que gerentes cumplen metas, que resultados dependen de su gestion, cuanto bono generan y que evidencia reduce, retiene o bloquea el pago.",
    },
    laboratorio: {
      title: "Gerentes de Laboratorio",
      subtitle: "Ordenes, margen, inventario, SLA y bono",
      description:
        "El bono se calcula con venta, utilidad, costo por orden, muestras, resultados, inventario, reactivos, medicos y datos.",
    },
    fisioterapia: {
      title: "Gerentes de Fisioterapia",
      subtitle: "Agenda efectiva, continuidad terapeutica y bono",
      description:
        "No premia solo agenda llena: revisa sesiones atendidas, continuidad, no-show, margen por sesion, experiencia y equipo.",
    },
    imagenes: {
      title: "Gerentes de Imagenes",
      subtitle: "Equipos, estudios, informes, SLA y bono",
      description:
        "El calculo incorpora utilizacion de equipos, disponibilidad tecnica, informes pendientes, repeticiones, costos y datos.",
    },
  };

  return {
    slug,
    ...titles[slug],
    rule:
      "Regla: Gerentes y bonos responde que tanto del resultado corresponde a la gestion del gerente y cuanto bono genera; no reemplaza Sucursales, Finanzas, Capacidad ni Profesionales.",
    weights: managerBonusWeightsByLine[slug],
    metrics: buildMetrics(records),
    records,
    executiveInsights: [
      "El score no depende solo de venta: rentabilidad, operacion, capacidad, pacientes, calidad, personas y datos pesan en la aprobacion.",
      "Un bono proyectado puede quedar retenido o bloqueado si existen cierres sin conciliar, baja calidad de datos, SLA critico o evidencia pendiente.",
      "La aprobacion final debe pasar por direccion, finanzas, RRHH y auditoria; el gerente puede ver el calculo y adjuntar evidencia, pero no editar reglas.",
      "Para gerentes multiservicio, una linea sobresaliente no puede ocultar una falla critica en otra.",
    ],
  };
}

function seriesForRecords(
  records: ManagerBonusRecord[],
  field: keyof ManagerBonusRecord["trend"],
  valueFormatter: (record: ManagerBonusRecord) => string,
): TrendSeries[] {
  const scoped = records.slice(0, 5);

  return [
    ...scoped.map((record, index) => ({
      label: record.manager,
      value: valueFormatter(record),
      color: trendColors[index % trendColors.length],
      points: record.trend[field],
    })),
    {
      label: field === "projectedBonus" ? "Meta presupuesto" : "Meta gerencial",
      value: field === "projectedBonus" ? "$900" : "85",
      color: "slate" as const,
      points: recordGoalPoints(field),
    },
  ];
}

function recordGoalPoints(field: keyof ManagerBonusRecord["trend"]) {
  if (field === "projectedBonus") {
    return [900, 900, 900, 900, 900, 900, 900];
  }

  return [85, 85, 85, 85, 85, 85, 85];
}

export function buildManagerBonusTrendChart(
  records: ManagerBonusRecord[],
): {
  title: string;
  description: string;
  xLabels: string[];
  yLabel: string;
  series: TrendSeries[];
  insights: TrendInsight[];
  metricOptions: TrendChartOption[];
} {
  const scopedRecords = records.slice(0, 5);
  const firstRecord = scopedRecords[0] ?? allManagerBonusRecords[0];
  const baseInsights: TrendInsight[] = [
    {
      label: "Comparacion",
      value: `${scopedRecords.length} gerentes`,
      note: "Puedes comparar fechas, periodo anterior, meta y hasta cinco gerentes visibles.",
      tone: "neutral",
    },
    {
      label: "Mayor riesgo",
      value: `${firstRecord?.bonusState ?? "Sin datos"}`,
      note: firstRecord?.explanation ?? "Selecciona una linea con datos.",
      tone: firstRecord?.bonusState === "Bloqueado" ? "negative" : "warning",
    },
    {
      label: "Decision",
      value: "Trazable",
      note: "Cada variacion del bono muestra causa, evidencia y responsable de revision.",
      tone: "positive",
    },
  ];
  const metricOptions: TrendChartOption[] = [
    {
      id: "score-gerencial",
      label: "Score gerencial",
      description:
        "Evolucion del score total por gerente, con fecha exacta al pasar sobre cada punto.",
      yLabel: "Score 0-100",
      series: seriesForRecords(scopedRecords, "totalScore", (record) => `${record.score}`),
      insights: baseInsights,
    },
    {
      id: "score-financiero",
      label: "Score financiero",
      description:
        "Finanzas separa venta, utilidad y margen para evitar bonos por crecimiento poco rentable.",
      yLabel: "Score financiero",
      series: seriesForRecords(scopedRecords, "financialScore", (record) =>
        `${getDimensionByLabel(record.dimensions, /Finanzas|Resultado financiero/)}`,
      ),
      insights: baseInsights,
    },
    {
      id: "score-operativo",
      label: "Score operativo",
      description:
        "Operacion muestra productividad, SLA, uso de capacidad y cuellos de botella.",
      yLabel: "Score operativo",
      series: seriesForRecords(scopedRecords, "operationalScore", (record) =>
        `${getDimensionByLabel(record.dimensions, /Operacion|Productividad|Utilizacion/)}`,
      ),
      insights: baseInsights,
    },
    {
      id: "score-calidad",
      label: "Score calidad",
      description:
        "Calidad permite detectar bonos altos con evidencia pendiente, reclamos o SLA debil.",
      yLabel: "Score calidad",
      series: seriesForRecords(scopedRecords, "qualityScore", (record) =>
        `${getDimensionByLabel(record.dimensions, /Calidad|SLA|Informes/)}`,
      ),
      insights: baseInsights,
    },
    {
      id: "bono-proyectado-gerente",
      label: "Bono proyectado",
      description:
        "Evolucion del bono proyectado frente a meta, periodo anterior o rango personalizado.",
      yLabel: "USD",
      series: seriesForRecords(scopedRecords, "projectedBonus", (record) =>
        formatCurrency(record.bonusProjected),
      ),
      insights: baseInsights,
    },
  ];

  return {
    title: "Evolucion del score y bono",
    description:
      "Selecciona KPI y rango de fechas; la grafica muestra valores exactos al pasar encima.",
    xLabels: exactDateLabels,
    yLabel: metricOptions[0].yLabel,
    series: metricOptions[0].series,
    insights: metricOptions[0].insights,
    metricOptions,
  };
}
