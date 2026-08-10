import {
  canPerformAction,
  type AuthorizationActor,
} from "../security/authorization-policy.ts";
import {
  demoBranches,
  demoCompanies,
  demoCountries,
  demoDefaultPeriod,
  demoOperationalAreas,
  type BranchOption,
} from "../tenant/demo-context.ts";
import type { ScopeBoundary } from "../tenant/delegation-policy.ts";

export type PhysiotherapyClosureStatus =
  | "draft"
  | "validation_failed"
  | "validated"
  | "published"
  | "replaced";

export type PhysiotherapyValidationState =
  | "VALIDADO"
  | "ADVERTENCIA"
  | "BLOQUEADO";

export type PhysiotherapyValidationSeverity = "error" | "warning";

export type PhysiotherapyKpiStatus = "CALCULABLE" | "NOT_CALCULABLE";

export type PhysiotherapyTargetDirection =
  | "HIGHER_IS_BETTER"
  | "LOWER_IS_BETTER"
  | "RANGE";

export type PhysiotherapyTargetStatus =
  | "cumplido"
  | "en_riesgo"
  | "incumplido"
  | "sin_meta"
  | "not_calculable";

export type PhysiotherapyTargetLifecycleStatus = "active" | "inactive";

export type PhysiotherapyInsightPriority =
  | "critica"
  | "alta"
  | "media"
  | "positiva";

export type PhysiotherapyClosureAction =
  | "draft_created"
  | "draft_updated"
  | "validated"
  | "validation_blocked"
  | "published"
  | "replaced";

export type PhysiotherapyFieldSource = "manual" | "catalog" | "system";

export type PhysiotherapyClosureInputs = {
  appointmentsCancelled: number;
  appointmentsCompleted: number;
  appointmentsScheduled: number;
  attendedHours: number;
  availableHours: number;
  closureObservations: string;
  directCosts: number;
  ordersTotal: number;
  patientsAttended: number;
  physiotherapistsActive: number;
  revenueTotal: number;
  scheduledHours: number;
  sessionsTotal: number;
  noShowAppointments: number;
};

export type PhysiotherapyClosureScope = ScopeBoundary & {
  areaManagerName: string;
  branchCode: string;
  branchName: string;
  businessLine: "PHYSIOTHERAPY";
  companyName: string;
  countryName: string;
  managerName: string;
};

export type PhysiotherapyValidationIssue = {
  code: string;
  field?: keyof PhysiotherapyClosureInputs | "period" | "branchId";
  message: string;
  severity: PhysiotherapyValidationSeverity;
};

export type PhysiotherapyKpiResult = {
  id: PhysiotherapyKpiId;
  label: string;
  formula: string;
  status: PhysiotherapyKpiStatus;
  unit: "currency" | "count" | "ratio";
  value: number | null;
  requiredFields: string[];
  missingFields: string[];
};

export type PhysiotherapyTarget = {
  approvedAt: string;
  approvedBy: string;
  branchId: string;
  companyId: string;
  countryId: string;
  direction: PhysiotherapyTargetDirection;
  id: string;
  isDemo: true;
  kpiId: PhysiotherapyTargetableKpiId;
  label: string;
  period: string;
  status: PhysiotherapyTargetLifecycleStatus;
  targetMaxValue?: number;
  targetMinValue?: number;
  targetValue: number;
  unit: "currency" | "count" | "ratio";
  version: number;
};

export type PhysiotherapyTargetComparison = {
  actualValue: number | null;
  complianceRate: number | null;
  direction: PhysiotherapyTargetDirection;
  kpiId: PhysiotherapyTargetableKpiId;
  label: string;
  status: PhysiotherapyTargetStatus;
  targetMaxValue?: number;
  targetMinValue?: number;
  targetValue: number | null;
  unit: "currency" | "count" | "ratio";
  variation: number | null;
};

export type PhysiotherapyInsight = {
  branchName: string;
  comparison: string;
  evidence: string;
  id: string;
  impact: string;
  kpiId: PhysiotherapyKpiId;
  period: string;
  priority: PhysiotherapyInsightPriority;
  recommendation: string;
  title: string;
  whatHappened: string;
};

export type PhysiotherapyAuditEvent = {
  action: PhysiotherapyClosureAction;
  actorEmail: string;
  actorId: string;
  at: string;
  closureId: string;
  details: string;
  period: string;
  branchId: string;
};

export type PhysiotherapyClosure = {
  auditEvents: PhysiotherapyAuditEvent[];
  createdAt: string;
  createdBy: string;
  dataQualityScore: number;
  duplicateOfClosureId: string | null;
  id: string;
  inputs: PhysiotherapyClosureInputs;
  isDemo: true;
  kpiResults: PhysiotherapyKpiResult[];
  period: string;
  publishedAt: string | null;
  publishedBy: string | null;
  replacedByClosureId: string | null;
  replacesClosureId: string | null;
  scope: PhysiotherapyClosureScope;
  sourceLineage: Record<keyof PhysiotherapyClosureInputs, PhysiotherapyFieldSource>;
  status: PhysiotherapyClosureStatus;
  submittedBy: string;
  targetComparisons: PhysiotherapyTargetComparison[];
  updatedAt: string;
  validatedAt: string | null;
  validation: {
    errors: PhysiotherapyValidationIssue[];
    state: PhysiotherapyValidationState;
    warnings: PhysiotherapyValidationIssue[];
  };
  version: number;
};

export type PhysiotherapyBranchSummary = {
  branchId: string;
  branchName: string;
  areaName: string;
  areaManagerName: string;
  managerName: string;
  period: string;
  revenue: number;
  revenueTarget: number | null;
  revenueCompliance: number | null;
  sessions: number;
  patients: number;
  effectiveOccupancy: number | null;
  noShowRate: number | null;
  contributionMargin: number;
  dataQualityScore: number;
  status: PhysiotherapyValidationState;
  closureId: string;
};

export type PhysiotherapyWorkspace = {
  actorRole: AuthorizationActor["roleKey"];
  auditEvents: PhysiotherapyAuditEvent[];
  branches: PhysiotherapyClosureScope[];
  branchSummaries: PhysiotherapyBranchSummary[];
  canCreateClosure: boolean;
  canManageTargets: boolean;
  canPublishClosure: boolean;
  closures: PhysiotherapyClosure[];
  currentPeriod: string;
  currentPeriodStatus: "sin_cierre" | "borrador" | "validado" | "publicado";
  draftClosure: PhysiotherapyClosure | null;
  insights: PhysiotherapyInsight[];
  latestPublishedClosure: PhysiotherapyClosure | null;
  pendingClosureCount: number;
  publishedClosures: PhysiotherapyClosure[];
  reportingPeriod: string;
  summary: PhysiotherapyRollupSummary;
  targetComparisons: PhysiotherapyTargetComparison[];
  targets: PhysiotherapyTarget[];
};

export type PhysiotherapyRollupSummary = {
  branchCount: number;
  closuresPublished: number;
  contributionMargin: number;
  dataQualityScore: number;
  effectiveOccupancy: number | null;
  noShowRate: number | null;
  patients: number;
  revenue: number;
  revenueCompliance: number | null;
  revenueTarget: number | null;
  sessions: number;
};

export type PhysiotherapyDraftPayload = {
  branchId?: unknown;
  closureObservations?: unknown;
  id?: unknown;
  inputs?: unknown;
  period?: unknown;
  replacesClosureId?: unknown;
};

export type PhysiotherapyTargetPayload = {
  branchId?: unknown;
  direction?: unknown;
  kpiId?: unknown;
  period?: unknown;
  status?: unknown;
  targetMaxValue?: unknown;
  targetMinValue?: unknown;
  targetValue?: unknown;
};

export type PhysiotherapyKpiId =
  | "facturacion_neta"
  | "cumplimiento_venta"
  | "ticket_promedio"
  | "sesiones_total"
  | "sesiones_por_paciente"
  | "ocupacion_agendada"
  | "ocupacion_efectiva"
  | "brecha_conversion"
  | "tasa_finalizacion"
  | "tasa_no_show"
  | "tasa_cancelacion"
  | "ingreso_por_hora"
  | "ingreso_por_fisioterapeuta"
  | "margen_contribucion"
  | "porcentaje_margen";

export type PhysiotherapyTargetableKpiId =
  | "facturacion_neta"
  | "ocupacion_efectiva"
  | "sesiones_total"
  | "tasa_no_show"
  | "margen_contribucion";

type PhysiotherapyStore = {
  auditEvents: PhysiotherapyAuditEvent[];
  closures: Map<string, PhysiotherapyClosure>;
  targets: Map<string, PhysiotherapyTarget>;
};

declare global {
  var analizaPhysiotherapyStore: PhysiotherapyStore | undefined;
}

const physiotherapyCompany =
  demoCompanies.find((company) => company.unitType === "fisioterapia") ??
  demoCompanies[0];
const demoOrganizationId = "10000000-0000-4000-8000-000000000001";
const currentDemoPeriod = "2026-08";

const kpiMeta: Record<
  PhysiotherapyKpiId,
  {
    label: string;
    formula: string;
    unit: PhysiotherapyKpiResult["unit"];
    requiredFields: string[];
  }
> = {
  brecha_conversion: {
    formula: "ocupacion_agendada - ocupacion_efectiva",
    label: "Brecha de conversion",
    requiredFields: ["scheduledHours", "attendedHours", "availableHours"],
    unit: "ratio",
  },
  cumplimiento_venta: {
    formula: "facturacion_neta / meta_facturacion",
    label: "Cumplimiento de venta",
    requiredFields: ["revenueTotal", "target_revenue"],
    unit: "ratio",
  },
  facturacion_neta: {
    formula: "revenueTotal",
    label: "Facturacion neta",
    requiredFields: ["revenueTotal"],
    unit: "currency",
  },
  ingreso_por_fisioterapeuta: {
    formula: "revenueTotal / physiotherapistsActive",
    label: "Ingreso por fisioterapeuta",
    requiredFields: ["revenueTotal", "physiotherapistsActive"],
    unit: "currency",
  },
  ingreso_por_hora: {
    formula: "revenueTotal / attendedHours",
    label: "Ingreso por hora",
    requiredFields: ["revenueTotal", "attendedHours"],
    unit: "currency",
  },
  margen_contribucion: {
    formula: "revenueTotal - directCosts",
    label: "Margen de contribucion",
    requiredFields: ["revenueTotal", "directCosts"],
    unit: "currency",
  },
  ocupacion_agendada: {
    formula: "scheduledHours / availableHours",
    label: "Ocupacion agendada",
    requiredFields: ["scheduledHours", "availableHours"],
    unit: "ratio",
  },
  ocupacion_efectiva: {
    formula: "attendedHours / availableHours",
    label: "Ocupacion efectiva",
    requiredFields: ["attendedHours", "availableHours"],
    unit: "ratio",
  },
  porcentaje_margen: {
    formula: "(revenueTotal - directCosts) / revenueTotal",
    label: "Porcentaje de margen",
    requiredFields: ["revenueTotal", "directCosts"],
    unit: "ratio",
  },
  sesiones_por_paciente: {
    formula: "sessionsTotal / patientsAttended",
    label: "Sesiones por paciente",
    requiredFields: ["sessionsTotal", "patientsAttended"],
    unit: "count",
  },
  sesiones_total: {
    formula: "sessionsTotal",
    label: "Sesiones",
    requiredFields: ["sessionsTotal"],
    unit: "count",
  },
  tasa_cancelacion: {
    formula: "appointmentsCancelled / appointmentsScheduled",
    label: "Tasa de cancelacion",
    requiredFields: ["appointmentsCancelled", "appointmentsScheduled"],
    unit: "ratio",
  },
  tasa_finalizacion: {
    formula: "appointmentsCompleted / appointmentsScheduled",
    label: "Tasa de finalizacion",
    requiredFields: ["appointmentsCompleted", "appointmentsScheduled"],
    unit: "ratio",
  },
  tasa_no_show: {
    formula: "noShowAppointments / appointmentsScheduled",
    label: "Tasa de no-show",
    requiredFields: ["noShowAppointments", "appointmentsScheduled"],
    unit: "ratio",
  },
  ticket_promedio: {
    formula: "revenueTotal / patientsAttended",
    label: "Ticket promedio",
    requiredFields: ["revenueTotal", "patientsAttended"],
    unit: "currency",
  },
};

const targetableKpis: Record<
  PhysiotherapyTargetableKpiId,
  {
    direction: PhysiotherapyTargetDirection;
    label: string;
    unit: PhysiotherapyTarget["unit"];
  }
> = {
  facturacion_neta: {
    direction: "HIGHER_IS_BETTER",
    label: "Facturacion",
    unit: "currency",
  },
  margen_contribucion: {
    direction: "HIGHER_IS_BETTER",
    label: "Margen de contribucion",
    unit: "currency",
  },
  ocupacion_efectiva: {
    direction: "HIGHER_IS_BETTER",
    label: "Ocupacion efectiva",
    unit: "ratio",
  },
  sesiones_total: {
    direction: "HIGHER_IS_BETTER",
    label: "Sesiones",
    unit: "count",
  },
  tasa_no_show: {
    direction: "LOWER_IS_BETTER",
    label: "No-show maximo",
    unit: "ratio",
  },
};

const inputFieldNames: Array<keyof PhysiotherapyClosureInputs> = [
  "appointmentsCancelled",
  "appointmentsCompleted",
  "appointmentsScheduled",
  "attendedHours",
  "availableHours",
  "closureObservations",
  "directCosts",
  "ordersTotal",
  "patientsAttended",
  "physiotherapistsActive",
  "revenueTotal",
  "scheduledHours",
  "sessionsTotal",
  "noShowAppointments",
];

type PhysiotherapyNumericInputKey = Exclude<
  keyof PhysiotherapyClosureInputs,
  "closureObservations"
>;

const numericInputFieldNames: PhysiotherapyNumericInputKey[] = [
  "appointmentsCancelled",
  "appointmentsCompleted",
  "appointmentsScheduled",
  "attendedHours",
  "availableHours",
  "directCosts",
  "ordersTotal",
  "patientsAttended",
  "physiotherapistsActive",
  "revenueTotal",
  "scheduledHours",
  "sessionsTotal",
  "noShowAppointments",
];

export function resetPhysiotherapyClosureStoreForTests() {
  globalThis.analizaPhysiotherapyStore = undefined;
}

export function getPhysiotherapyBranches() {
  return demoBranches
    .filter((branch) => branch.companyId === physiotherapyCompany.id)
    .filter((branch) => branch.isActive !== false)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getCountryName(countryId: string) {
  return (
    demoCountries.find((country) => country.id === countryId)?.name ??
    "Pais DEMO"
  );
}

function getOperationalArea(branch: BranchOption) {
  return demoOperationalAreas.find(
    (area) => area.id === branch.operationalAreaId,
  );
}

function toClosureScope(branch: BranchOption): PhysiotherapyClosureScope {
  const area = getOperationalArea(branch);

  return {
    branchCode: branch.code,
    branchId: branch.id,
    branchName: branch.name,
    businessLine: "PHYSIOTHERAPY",
    companyId: branch.companyId,
    companyName: physiotherapyCompany.name,
    countryId: branch.countryId,
    countryName: getCountryName(branch.countryId),
    managerName: branch.branchManagerName ?? "Gerente de sucursal pendiente",
    operationalAreaId: branch.operationalAreaId ?? null,
    areaManagerName:
      branch.areaManagerName ?? area?.managerName ?? "Gerente de area pendiente",
    organizationId: area?.organizationId ?? demoOrganizationId,
  };
}

function branchScope(branch: BranchOption): ScopeBoundary {
  return {
    branchId: branch.id,
    companyId: branch.companyId,
    countryId: branch.countryId,
    operationalAreaId: branch.operationalAreaId ?? null,
    organizationId:
      getOperationalArea(branch)?.organizationId ?? demoOrganizationId,
  };
}

function canActorReadBranch(actor: AuthorizationActor, branch: BranchOption) {
  return canPerformAction(actor, "record.read", {
    scope: branchScope(branch),
  });
}

export function getPhysiotherapyBranchesForActor(actor: AuthorizationActor) {
  return getPhysiotherapyBranches().filter((branch) =>
    canActorReadBranch(actor, branch),
  );
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeIdPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(/,/g, "");

    if (!normalized) {
      return Number.NaN;
    }

    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return Number.NaN;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidPeriod(value: string) {
  return /^\d{4}-\d{2}$/.test(value);
}

function isFuturePeriod(period: string) {
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const latestAllowedPeriod =
    currentPeriod > currentDemoPeriod ? currentPeriod : currentDemoPeriod;

  return period > latestAllowedPeriod;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function ratio(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }

  if (denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}

function kpiResult(
  id: PhysiotherapyKpiId,
  value: number | null,
  missingFields: string[] = [],
): PhysiotherapyKpiResult {
  const meta = kpiMeta[id];

  return {
    ...meta,
    id,
    missingFields,
    status:
      value === null || !Number.isFinite(value)
        ? "NOT_CALCULABLE"
        : "CALCULABLE",
    value: value === null || !Number.isFinite(value) ? null : round(value, 4),
  };
}

function getKpiValue(
  kpis: PhysiotherapyKpiResult[],
  id: PhysiotherapyKpiId,
) {
  return kpis.find((kpi) => kpi.id === id)?.value ?? null;
}

function missingInputFields(
  inputs: PhysiotherapyClosureInputs,
  fields: PhysiotherapyNumericInputKey[],
) {
  return fields.filter((fieldName) => !Number.isFinite(inputs[fieldName]));
}

function missingOrInvalidDenominator(
  inputs: PhysiotherapyClosureInputs,
  fieldName: PhysiotherapyNumericInputKey,
) {
  const missingFields = missingInputFields(inputs, [fieldName]);

  if (missingFields.length > 0) {
    return missingFields;
  }

  return inputs[fieldName] <= 0 ? [fieldName] : [];
}

function sourceLineage(): PhysiotherapyClosure["sourceLineage"] {
  return inputFieldNames.reduce<PhysiotherapyClosure["sourceLineage"]>(
    (lineage, fieldName) => {
      lineage[fieldName] =
        fieldName === "closureObservations" ? "manual" : "manual";
      return lineage;
    },
    {} as PhysiotherapyClosure["sourceLineage"],
  );
}

function createAuditEvent({
  action,
  actor,
  closure,
  details,
}: {
  action: PhysiotherapyClosureAction;
  actor: AuthorizationActor;
  closure: Pick<PhysiotherapyClosure, "id" | "period" | "scope">;
  details: string;
}): PhysiotherapyAuditEvent {
  return {
    action,
    actorEmail: actor.email,
    actorId: actor.userId,
    at: nowIso(),
    branchId: closure.scope.branchId ?? "",
    closureId: closure.id,
    details,
    period: closure.period,
  };
}

function assertWritableRole(actor: AuthorizationActor) {
  if (
    actor.roleKey === "viewer" ||
    actor.roleKey === "ceo" ||
    actor.roleKey === "usuario_operativo"
  ) {
    throw new Error("Este rol no puede crear ni publicar cierres.");
  }
}

function canWriteClosure(actor: AuthorizationActor) {
  return !["viewer", "ceo", "usuario_operativo"].includes(actor.roleKey);
}

function canManageTargets(actor: AuthorizationActor) {
  return [
    "super_admin",
    "webmaster_admin",
    "ceo",
    "gerente_operaciones",
    "gerente_area",
  ].includes(actor.roleKey);
}

function getClosureTarget(
  targets: PhysiotherapyTarget[],
  closure: PhysiotherapyClosure,
  kpiId: PhysiotherapyTargetableKpiId,
) {
  const latestTarget =
    targets
      .filter(
        (target) =>
          target.period === closure.period &&
          target.branchId === closure.scope.branchId &&
          target.kpiId === kpiId,
      )
      .sort((left, right) => right.version - left.version)[0] ?? null;

  return latestTarget?.status === "active" ? latestTarget : null;
}

function calculateKpis(
  inputs: PhysiotherapyClosureInputs,
  targets: PhysiotherapyTarget[],
  closureShell: Pick<PhysiotherapyClosure, "period" | "scope">,
) {
  const targetShell = {
    ...closureShell,
    id: "kpi-shell",
    inputs,
  } as PhysiotherapyClosure;
  const revenueTarget = getClosureTarget(
    targets,
    targetShell,
    "facturacion_neta",
  )?.targetValue;
  const marginContribution = inputs.revenueTotal - inputs.directCosts;
  const revenueAttainment =
    typeof revenueTarget === "number"
      ? ratio(inputs.revenueTotal, revenueTarget)
      : null;
  const revenueFields = missingInputFields(inputs, ["revenueTotal"]);
  const patientDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "patientsAttended",
  );
  const availableDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "availableHours",
  );
  const appointmentsDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "appointmentsScheduled",
  );
  const attendedDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "attendedHours",
  );
  const therapistDenominatorFields = missingOrInvalidDenominator(
    inputs,
    "physiotherapistsActive",
  );
  const sessionPatientFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["sessionsTotal"]),
      ...patientDenominatorFields,
    ]),
  );
  const availableScheduledFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["scheduledHours"]),
      ...availableDenominatorFields,
    ]),
  );
  const availableAttendedFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["attendedHours"]),
      ...availableDenominatorFields,
    ]),
  );
  const appointmentFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["appointmentsCompleted"]),
      ...appointmentsDenominatorFields,
    ]),
  );
  const noShowFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["noShowAppointments"]),
      ...appointmentsDenominatorFields,
    ]),
  );
  const cancellationFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["appointmentsCancelled"]),
      ...appointmentsDenominatorFields,
    ]),
  );
  const hourlyFields = Array.from(
    new Set([...revenueFields, ...attendedDenominatorFields]),
  );
  const therapistFields = Array.from(
    new Set([...revenueFields, ...therapistDenominatorFields]),
  );
  const marginFields = missingInputFields(inputs, ["revenueTotal", "directCosts"]);
  const marginRateFields = Array.from(
    new Set([
      ...missingInputFields(inputs, ["directCosts"]),
      ...missingOrInvalidDenominator(inputs, "revenueTotal"),
    ]),
  );
  const conversionGapFields = Array.from(
    new Set([...availableScheduledFields, ...availableAttendedFields]),
  );

  return [
    kpiResult("facturacion_neta", inputs.revenueTotal, revenueFields),
    kpiResult(
      "cumplimiento_venta",
      revenueAttainment,
      [
        ...revenueFields,
        ...(typeof revenueTarget === "number" ? [] : ["target_revenue"]),
      ],
    ),
    kpiResult(
      "ticket_promedio",
      ratio(inputs.revenueTotal, inputs.patientsAttended),
      [...revenueFields, ...patientDenominatorFields],
    ),
    kpiResult(
      "sesiones_total",
      inputs.sessionsTotal,
      missingInputFields(inputs, ["sessionsTotal"]),
    ),
    kpiResult(
      "sesiones_por_paciente",
      ratio(inputs.sessionsTotal, inputs.patientsAttended),
      sessionPatientFields,
    ),
    kpiResult(
      "ocupacion_agendada",
      ratio(inputs.scheduledHours, inputs.availableHours),
      availableScheduledFields,
    ),
    kpiResult(
      "ocupacion_efectiva",
      ratio(inputs.attendedHours, inputs.availableHours),
      availableAttendedFields,
    ),
    kpiResult(
      "brecha_conversion",
      inputs.availableHours > 0
        ? inputs.scheduledHours / inputs.availableHours -
            inputs.attendedHours / inputs.availableHours
        : null,
      conversionGapFields,
    ),
    kpiResult(
      "tasa_finalizacion",
      ratio(inputs.appointmentsCompleted, inputs.appointmentsScheduled),
      appointmentFields,
    ),
    kpiResult(
      "tasa_no_show",
      ratio(inputs.noShowAppointments, inputs.appointmentsScheduled),
      noShowFields,
    ),
    kpiResult(
      "tasa_cancelacion",
      ratio(inputs.appointmentsCancelled, inputs.appointmentsScheduled),
      cancellationFields,
    ),
    kpiResult(
      "ingreso_por_hora",
      ratio(inputs.revenueTotal, inputs.attendedHours),
      hourlyFields,
    ),
    kpiResult(
      "ingreso_por_fisioterapeuta",
      ratio(inputs.revenueTotal, inputs.physiotherapistsActive),
      therapistFields,
    ),
    kpiResult("margen_contribucion", marginContribution, marginFields),
    kpiResult(
      "porcentaje_margen",
      ratio(marginContribution, inputs.revenueTotal),
      marginRateFields,
    ),
  ];
}

function getTargetStatus({
  actual,
  target,
}: {
  actual: number | null;
  target: PhysiotherapyTarget;
}): PhysiotherapyTargetStatus {
  if (actual === null) {
    return "not_calculable";
  }

  if (target.direction === "HIGHER_IS_BETTER") {
    if (actual >= target.targetValue) {
      return "cumplido";
    }

    return actual >= target.targetValue * 0.9 ? "en_riesgo" : "incumplido";
  }

  if (target.direction === "LOWER_IS_BETTER") {
    if (actual <= target.targetValue) {
      return "cumplido";
    }

    return actual <= target.targetValue * 1.15 ? "en_riesgo" : "incumplido";
  }

  if (
    typeof target.targetMinValue === "number" &&
    typeof target.targetMaxValue === "number"
  ) {
    return actual >= target.targetMinValue && actual <= target.targetMaxValue
      ? "cumplido"
      : "incumplido";
  }

  return "sin_meta";
}

function getComplianceRate({
  actual,
  target,
}: {
  actual: number | null;
  target: PhysiotherapyTarget;
}) {
  if (actual === null) {
    return null;
  }

  if (target.direction === "LOWER_IS_BETTER") {
    if (actual === 0) {
      return 1;
    }

    return ratio(target.targetValue, actual);
  }

  if (target.direction === "RANGE") {
    return getTargetStatus({ actual, target }) === "cumplido" ? 1 : 0;
  }

  return ratio(actual, target.targetValue);
}

function calculateTargetComparisons(
  kpis: PhysiotherapyKpiResult[],
  closure: PhysiotherapyClosure,
  targets: PhysiotherapyTarget[],
): PhysiotherapyTargetComparison[] {
  return Object.entries(targetableKpis).map(([rawKpiId, definition]) => {
    const kpiId = rawKpiId as PhysiotherapyTargetableKpiId;
    const actualValue = getKpiValue(kpis, kpiId);
    const target = getClosureTarget(targets, closure, kpiId);

    if (!target) {
      return {
        actualValue,
        complianceRate: null,
        direction: definition.direction,
        kpiId,
        label: definition.label,
        status: actualValue === null ? "not_calculable" : "sin_meta",
        targetValue: null,
        unit: definition.unit,
        variation: null,
      };
    }

    return {
      actualValue,
      complianceRate: getComplianceRate({ actual: actualValue, target }),
      direction: target.direction,
      kpiId,
      label: target.label,
      status: getTargetStatus({ actual: actualValue, target }),
      targetMaxValue: target.targetMaxValue,
      targetMinValue: target.targetMinValue,
      targetValue: target.targetValue,
      unit: target.unit,
      variation: actualValue === null ? null : actualValue - target.targetValue,
    };
  });
}

function getExistingPublishedClosure(
  store: PhysiotherapyStore,
  branchId: string,
  period: string,
) {
  return [...store.closures.values()].find(
    (closure) =>
      closure.scope.branchId === branchId &&
      closure.period === period &&
      closure.status === "published",
  );
}

function validateClosure(
  store: PhysiotherapyStore,
  closure: PhysiotherapyClosure,
): PhysiotherapyClosure["validation"] {
  const errors: PhysiotherapyValidationIssue[] = [];
  const warnings: PhysiotherapyValidationIssue[] = [];
  const inputs = closure.inputs;

  if (!isValidPeriod(closure.period)) {
    errors.push({
      code: "period.invalid",
      field: "period",
      message: "El periodo debe tener formato YYYY-MM.",
      severity: "error",
    });
  } else if (isFuturePeriod(closure.period)) {
    errors.push({
      code: "period.future",
      field: "period",
      message: "No se puede publicar un cierre de un periodo futuro.",
      severity: "error",
    });
  }

  if (!closure.scope.branchId) {
    errors.push({
      code: "branch.required",
      field: "branchId",
      message: "La sucursal es obligatoria.",
      severity: "error",
    });
  }

  for (const fieldName of numericInputFieldNames) {
    const fieldValue = inputs[fieldName];

    if (!Number.isFinite(fieldValue)) {
      errors.push({
        code: "number.missing_required",
        field: fieldName,
        message: "Falta un dato fuente obligatorio.",
        severity: "error",
      });

      continue;
    }

    if (fieldValue < 0) {
      errors.push({
        code: "number.negative",
        field: fieldName,
        message: "El valor debe ser cero o mayor.",
        severity: "error",
      });
    }
  }

  const hoursLimit =
    Number.isFinite(inputs.physiotherapistsActive) &&
    inputs.physiotherapistsActive > 0
      ? inputs.physiotherapistsActive * 744
      : null;

  if (hoursLimit !== null) {
    for (const fieldName of [
      "attendedHours",
      "availableHours",
      "scheduledHours",
    ] satisfies PhysiotherapyNumericInputKey[]) {
      if (inputs[fieldName] > hoursLimit) {
        errors.push({
          code: "hours.unreasonable",
          field: fieldName,
          message:
            "Las horas mensuales superan un maximo razonable para el personal activo.",
          severity: "error",
        });
      }
    }
  }

  const appointmentOutcomes =
    inputs.appointmentsCompleted +
    inputs.appointmentsCancelled +
    inputs.noShowAppointments;

  if (
    Number.isFinite(appointmentOutcomes) &&
    Number.isFinite(inputs.appointmentsScheduled) &&
    appointmentOutcomes > inputs.appointmentsScheduled
  ) {
    warnings.push({
      code: "appointments.outcomes_exceed_scheduled",
      field: "appointmentsScheduled",
      message:
        "Completadas + canceladas + no-show supera las citas agendadas. Validar agenda antes de publicar.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(appointmentOutcomes) &&
    Number.isFinite(inputs.appointmentsScheduled) &&
    inputs.appointmentsScheduled > 0 &&
    appointmentOutcomes < inputs.appointmentsScheduled
  ) {
    warnings.push({
      code: "appointments.unclassified",
      field: "appointmentsScheduled",
      message:
        "Hay citas agendadas sin estado final. El KPI se calcula, pero requiere revision.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.attendedHours) &&
    Number.isFinite(inputs.availableHours) &&
    inputs.attendedHours > inputs.availableHours
  ) {
    warnings.push({
      code: "hours.attended_exceed_available",
      field: "attendedHours",
      message:
        "Las horas atendidas superan las horas disponibles. Validar capacidad o captura.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.scheduledHours) &&
    Number.isFinite(inputs.availableHours) &&
    inputs.scheduledHours > inputs.availableHours
  ) {
    warnings.push({
      code: "hours.scheduled_exceed_available",
      field: "scheduledHours",
      message:
        "Las horas agendadas superan la capacidad disponible. Validar agenda o capacidad.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.attendedHours) &&
    Number.isFinite(inputs.scheduledHours) &&
    inputs.attendedHours > inputs.scheduledHours
  ) {
    warnings.push({
      code: "hours.attended_exceed_scheduled",
      field: "attendedHours",
      message:
        "Las horas atendidas superan las agendadas. Puede ser real por atenciones extra, pero debe revisarse.",
      severity: "warning",
    });
  }

  if (
    Number.isFinite(inputs.directCosts) &&
    Number.isFinite(inputs.revenueTotal) &&
    inputs.directCosts > inputs.revenueTotal &&
    inputs.revenueTotal > 0
  ) {
    warnings.push({
      code: "margin.negative",
      field: "directCosts",
      message:
        "Los costos directos superan la facturacion. El margen queda negativo.",
      severity: "warning",
    });
  }

  if (
    warnings.some((warning) =>
      [
        "appointments.outcomes_exceed_scheduled",
        "hours.attended_exceed_available",
        "hours.scheduled_exceed_available",
        "margin.negative",
      ].includes(warning.code),
    ) &&
    inputs.closureObservations.trim().length < 12
  ) {
    warnings.push({
      code: "observations.variation_context",
      field: "closureObservations",
      message:
        "Agregue una explicacion breve para la variacion relevante del cierre.",
      severity: "warning",
    });
  }

  if (inputs.closureObservations.match(/\b\d{4}[- ]?\d{4}\b|\b\d{8,}\b/)) {
    errors.push({
      code: "observations.possible_pii",
      field: "closureObservations",
      message:
        "Las observaciones no deben incluir telefonos, identificadores ni datos personales.",
      severity: "error",
    });
  }

  const duplicateClosure = getExistingPublishedClosure(
    store,
    closure.scope.branchId ?? "",
    closure.period,
  );

  if (
    duplicateClosure &&
    duplicateClosure.id !== closure.id &&
    duplicateClosure.id !== closure.replacesClosureId
  ) {
    errors.push({
      code: "closure.duplicate_published",
      field: "period",
      message:
        "Ya existe un cierre publicado para esta sucursal y periodo. Use una correccion versionada.",
      severity: "error",
    });
  }

  return {
    errors,
    state:
      errors.length > 0
        ? "BLOQUEADO"
        : warnings.length > 0
          ? "ADVERTENCIA"
          : "VALIDADO",
    warnings,
  };
}

function calculateQualityScore(validation: PhysiotherapyClosure["validation"]) {
  return Math.max(
    0,
    Math.min(100, 100 - validation.errors.length * 20 - validation.warnings.length * 7),
  );
}

function withCalculatedFields(
  store: PhysiotherapyStore,
  closure: PhysiotherapyClosure,
): PhysiotherapyClosure {
  const targets = [...store.targets.values()];
  const kpiResults = calculateKpis(closure.inputs, targets, closure);
  const validation = validateClosure(store, closure);
  const calculatedClosure = {
    ...closure,
    dataQualityScore: calculateQualityScore(validation),
    kpiResults,
    validation,
  };

  return {
    ...calculatedClosure,
    targetComparisons: calculateTargetComparisons(
      kpiResults,
      calculatedClosure,
      targets,
    ),
  };
}

function defaultInputs(index = 0): PhysiotherapyClosureInputs {
  const revenueTotal = 32000 + index * 3900;
  const appointmentsScheduled = 520 + index * 28;
  const noShowAppointments = 32 + index * 3;
  const appointmentsCancelled = 28 + index * 2;
  const appointmentsCompleted =
    appointmentsScheduled - noShowAppointments - appointmentsCancelled;
  const availableHours = 250 + index * 12;
  const scheduledHours = Math.round(availableHours * (0.78 + index * 0.01));
  const attendedHours = Math.round(availableHours * (0.68 + index * 0.01));

  return {
    appointmentsCancelled,
    appointmentsCompleted,
    appointmentsScheduled,
    attendedHours,
    availableHours,
    closureObservations:
      "DEMO: cierre de entrenamiento para validar el flujo end-to-end.",
    directCosts: Math.round(revenueTotal * (0.56 + index * 0.01)),
    ordersTotal: 360 + index * 22,
    patientsAttended: 285 + index * 18,
    physiotherapistsActive: 4 + (index % 3),
    revenueTotal,
    scheduledHours,
    sessionsTotal: appointmentsCompleted,
    noShowAppointments,
  };
}

function createTargetId(
  period: string,
  branchId: string,
  kpiId: PhysiotherapyTargetableKpiId,
  version: number,
) {
  return `physio-target-${sanitizeIdPart(branchId)}-${period}-${kpiId}-v${version}`;
}

function createSeedTargets(
  branch: BranchOption,
  period: string,
  inputs: PhysiotherapyClosureInputs,
  index: number,
) {
  const baseTargets: Array<{
    kpiId: PhysiotherapyTargetableKpiId;
    targetValue: number;
  }> = [
    {
      kpiId: "facturacion_neta",
      targetValue: Math.round(inputs.revenueTotal * (index % 2 === 0 ? 1.03 : 0.97)),
    },
    {
      kpiId: "ocupacion_efectiva",
      targetValue: 0.74,
    },
    {
      kpiId: "sesiones_total",
      targetValue: Math.round(inputs.sessionsTotal * 1.04),
    },
    {
      kpiId: "tasa_no_show",
      targetValue: 0.07,
    },
    {
      kpiId: "margen_contribucion",
      targetValue: Math.round((inputs.revenueTotal - inputs.directCosts) * 1.02),
    },
  ];

  return baseTargets.map(({ kpiId, targetValue }) => {
    const definition = targetableKpis[kpiId];

    return {
      approvedAt: `${period}-01T06:00:00.000Z`,
      approvedBy: "DEMO operaciones fisioterapia",
      branchId: branch.id,
      companyId: branch.companyId,
      countryId: branch.countryId,
      direction: definition.direction,
      id: createTargetId(period, branch.id, kpiId, 1),
      isDemo: true,
      kpiId,
      label: definition.label,
      period,
      status: "active",
      targetValue: round(targetValue, 4),
      unit: definition.unit,
      version: 1,
    } satisfies PhysiotherapyTarget;
  });
}

function createSeedClosure(
  branch: BranchOption,
  period: string,
  inputs: PhysiotherapyClosureInputs,
  index: number,
): PhysiotherapyClosure {
  const createdAt = `${period}-28T08:0${index % 9}:00.000Z`;
  const baseClosure: PhysiotherapyClosure = {
    auditEvents: [],
    createdAt,
    createdBy: "demo-seed",
    dataQualityScore: 100,
    duplicateOfClosureId: null,
    id: `physio-closure-${sanitizeIdPart(branch.id)}-${period}-v1`,
    inputs,
    isDemo: true,
    kpiResults: [],
    period,
    publishedAt: `${period}-28T09:0${index % 9}:00.000Z`,
    publishedBy: "DEMO operaciones fisioterapia",
    replacedByClosureId: null,
    replacesClosureId: null,
    scope: toClosureScope(branch),
    sourceLineage: sourceLineage(),
    status: "published",
    submittedBy: branch.branchManagerName ?? "Gerente de sucursal DEMO",
    targetComparisons: [],
    updatedAt: createdAt,
    validatedAt: `${period}-28T08:3${index % 9}:00.000Z`,
    validation: {
      errors: [],
      state: "VALIDADO",
      warnings:
        inputs.appointmentsCompleted +
          inputs.appointmentsCancelled +
          inputs.noShowAppointments <
        inputs.appointmentsScheduled
          ? [
              {
                code: "appointments.unclassified",
                field: "appointmentsScheduled",
                message:
                  "Hay citas agendadas sin estado final. El KPI se calcula, pero requiere revision.",
                severity: "warning",
              },
            ]
          : [],
    },
    version: 1,
  };

  return baseClosure;
}

function seedStore(store: PhysiotherapyStore) {
  const branches = getPhysiotherapyBranches().filter(
    (branch) => branch.operationalAreaId,
  );
  const seedPeriod = demoDefaultPeriod;

  branches.forEach((branch, index) => {
    const inputs = defaultInputs(index);

    for (const target of createSeedTargets(branch, seedPeriod, inputs, index)) {
      store.targets.set(target.id, target);
    }

    for (const target of createSeedTargets(
      branch,
      currentDemoPeriod,
      {
        ...inputs,
        revenueTotal: Math.round(inputs.revenueTotal * 1.05),
        sessionsTotal: Math.round(inputs.sessionsTotal * 1.03),
      },
      index,
    )) {
      store.targets.set(target.id, target);
    }

    const closure = withCalculatedFields(
      store,
      createSeedClosure(branch, seedPeriod, inputs, index),
    );
    const auditEvent: PhysiotherapyAuditEvent = {
      action: "published",
      actorEmail: "demo-fisioterapia@analiza.local",
      actorId: "demo-seed",
      at: closure.publishedAt ?? closure.updatedAt,
      branchId: branch.id,
      closureId: closure.id,
      details: "Seed DEMO publicado desde el catalogo gestionado de Fisioterapia.",
      period: closure.period,
    };

    closure.auditEvents.push(auditEvent);
    store.auditEvents.push(auditEvent);
    store.closures.set(closure.id, closure);
  });
}

function getStore() {
  if (!globalThis.analizaPhysiotherapyStore) {
    const store: PhysiotherapyStore = {
      auditEvents: [],
      closures: new Map(),
      targets: new Map(),
    };

    seedStore(store);
    globalThis.analizaPhysiotherapyStore = store;
  }

  return globalThis.analizaPhysiotherapyStore;
}

function getBranchForPayload(actor: AuthorizationActor, branchId: string) {
  const branch = getPhysiotherapyBranches().find(
    (candidate) => candidate.id === branchId,
  );

  if (!branch) {
    throw new Error("Sucursal de Fisioterapia no encontrada.");
  }

  if (!canActorReadBranch(actor, branch)) {
    throw new Error("El usuario no tiene alcance sobre esta sucursal.");
  }

  return branch;
}

function parseInputs(payload: PhysiotherapyDraftPayload) {
  const inputRecord =
    typeof payload.inputs === "object" &&
    payload.inputs !== null &&
    !Array.isArray(payload.inputs)
      ? (payload.inputs as Record<string, unknown>)
      : {};

  return {
    appointmentsCancelled: readNumber(inputRecord.appointmentsCancelled),
    appointmentsCompleted: readNumber(inputRecord.appointmentsCompleted),
    appointmentsScheduled: readNumber(inputRecord.appointmentsScheduled),
    attendedHours: readNumber(inputRecord.attendedHours),
    availableHours: readNumber(inputRecord.availableHours),
    closureObservations: readString(
      inputRecord.closureObservations ?? payload.closureObservations,
    ).slice(0, 1200),
    directCosts: readNumber(inputRecord.directCosts),
    ordersTotal: readNumber(inputRecord.ordersTotal),
    patientsAttended: readNumber(inputRecord.patientsAttended),
    physiotherapistsActive: readNumber(inputRecord.physiotherapistsActive),
    revenueTotal: readNumber(inputRecord.revenueTotal),
    scheduledHours: readNumber(inputRecord.scheduledHours),
    sessionsTotal: readNumber(inputRecord.sessionsTotal),
    noShowAppointments: readNumber(inputRecord.noShowAppointments),
  } satisfies PhysiotherapyClosureInputs;
}

function getNextVersion(
  store: PhysiotherapyStore,
  branchId: string,
  period: string,
) {
  return (
    Math.max(
      0,
      ...[...store.closures.values()]
        .filter(
          (closure) =>
            closure.scope.branchId === branchId && closure.period === period,
        )
        .map((closure) => closure.version),
    ) + 1
  );
}

function appendAudit(
  store: PhysiotherapyStore,
  closure: PhysiotherapyClosure,
  event: PhysiotherapyAuditEvent,
) {
  closure.auditEvents = [event, ...closure.auditEvents];
  store.auditEvents = [event, ...store.auditEvents];
}

export function savePhysiotherapyClosureDraft(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  assertWritableRole(actor);

  const store = getStore();
  const payload = (typeof rawPayload === "object" && rawPayload !== null
    ? rawPayload
    : {}) as PhysiotherapyDraftPayload;
  const branchId = readString(payload.branchId);
  const branch = getBranchForPayload(actor, branchId);
  const period = readString(payload.period) || currentDemoPeriod;
  const inputs = parseInputs(payload);
  const existingId = readString(payload.id);
  const replacesClosureId = readString(payload.replacesClosureId) || null;
  const existingClosure = existingId ? store.closures.get(existingId) : null;
  const timestamp = nowIso();

  if (existingClosure && existingClosure.status === "published") {
    throw new Error("Un cierre publicado no se edita de forma silenciosa.");
  }

  if (replacesClosureId) {
    const replaced = store.closures.get(replacesClosureId);

    if (
      !replaced ||
      replaced.status !== "published" ||
      replaced.scope.branchId !== branch.id ||
      replaced.period !== period
    ) {
      throw new Error("La correccion versionada no coincide con el cierre publicado.");
    }
  }

  const version =
    existingClosure?.version ?? getNextVersion(store, branch.id, period);
  const id =
    existingClosure?.id ??
    `physio-closure-${sanitizeIdPart(branch.id)}-${period}-v${version}`;
  const baseClosure: PhysiotherapyClosure = {
    auditEvents: existingClosure?.auditEvents ?? [],
    createdAt: existingClosure?.createdAt ?? timestamp,
    createdBy: existingClosure?.createdBy ?? actor.userId,
    dataQualityScore: existingClosure?.dataQualityScore ?? 0,
    duplicateOfClosureId:
      getExistingPublishedClosure(store, branch.id, period)?.id ?? null,
    id,
    inputs,
    isDemo: true,
    kpiResults: existingClosure?.kpiResults ?? [],
    period,
    publishedAt: null,
    publishedBy: null,
    replacedByClosureId: null,
    replacesClosureId,
    scope: toClosureScope(branch),
    sourceLineage: sourceLineage(),
    status: "draft",
    submittedBy: actor.email,
    targetComparisons: existingClosure?.targetComparisons ?? [],
    updatedAt: timestamp,
    validatedAt: null,
    validation: existingClosure?.validation ?? {
      errors: [],
      state: "BLOQUEADO",
      warnings: [],
    },
    version,
  };
  const closure = withCalculatedFields(store, baseClosure);
  const event = createAuditEvent({
    action: existingClosure ? "draft_updated" : "draft_created",
    actor,
    closure,
    details: existingClosure
      ? "Borrador actualizado desde formulario Fisioterapia."
      : "Borrador creado desde formulario Fisioterapia.",
  });

  appendAudit(store, closure, event);
  store.closures.set(closure.id, closure);

  return closure;
}

export function validatePhysiotherapyClosureDraft(
  actor: AuthorizationActor,
  closureId: string,
) {
  assertWritableRole(actor);

  const store = getStore();
  const closure = store.closures.get(closureId);

  if (!closure) {
    throw new Error("Cierre no encontrado.");
  }

  const branch = getBranchForPayload(actor, closure.scope.branchId ?? "");
  const recalculated = withCalculatedFields(store, {
    ...closure,
    scope: toClosureScope(branch),
    updatedAt: nowIso(),
    validatedAt: nowIso(),
  });
  const validated: PhysiotherapyClosure = {
    ...recalculated,
    status:
      recalculated.validation.errors.length > 0
        ? "validation_failed"
        : "validated",
  };
  const event = createAuditEvent({
    action:
      validated.validation.errors.length > 0 ? "validation_blocked" : "validated",
    actor,
    closure: validated,
    details:
      validated.validation.errors.length > 0
        ? "Validacion bloqueada por reglas de calidad."
        : "Cierre validado por reglas server-side.",
  });

  appendAudit(store, validated, event);
  store.closures.set(validated.id, validated);

  return validated;
}

export function publishPhysiotherapyClosure(
  actor: AuthorizationActor,
  closureId: string,
) {
  assertWritableRole(actor);

  const store = getStore();
  const closure = validatePhysiotherapyClosureDraft(actor, closureId);

  if (closure.validation.errors.length > 0) {
    throw new Error("No se puede publicar un cierre bloqueado.");
  }

  const existingPublished = getExistingPublishedClosure(
    store,
    closure.scope.branchId ?? "",
    closure.period,
  );

  if (
    existingPublished &&
    existingPublished.id !== closure.replacesClosureId &&
    existingPublished.id !== closure.id
  ) {
    throw new Error("Ya existe un cierre publicado. Use correccion versionada.");
  }

  const timestamp = nowIso();
  const published: PhysiotherapyClosure = withCalculatedFields(store, {
    ...closure,
    publishedAt: timestamp,
    publishedBy: actor.email,
    status: "published",
    updatedAt: timestamp,
  });

  if (closure.replacesClosureId) {
    const replaced = store.closures.get(closure.replacesClosureId);

    if (replaced) {
      const replacementEvent = createAuditEvent({
        action: "replaced",
        actor,
        closure: replaced,
        details: `Reemplazado por correccion versionada ${published.id}.`,
      });
      const replacedClosure: PhysiotherapyClosure = {
        ...replaced,
        replacedByClosureId: published.id,
        status: "replaced",
        updatedAt: timestamp,
      };

      appendAudit(store, replacedClosure, replacementEvent);
      store.closures.set(replacedClosure.id, replacedClosure);
    }
  }

  const event = createAuditEvent({
    action: "published",
    actor,
    closure: published,
    details: "Cierre publicado y disponible para KPIs, metas e insights.",
  });

  appendAudit(store, published, event);
  store.closures.set(published.id, published);

  return published;
}

function readTargetDirection(
  value: unknown,
  fallback: PhysiotherapyTargetDirection,
) {
  if (
    value === "HIGHER_IS_BETTER" ||
    value === "LOWER_IS_BETTER" ||
    value === "RANGE"
  ) {
    return value;
  }

  return fallback;
}

function readTargetKpiId(value: unknown): PhysiotherapyTargetableKpiId {
  if (
    value === "facturacion_neta" ||
    value === "ocupacion_efectiva" ||
    value === "sesiones_total" ||
    value === "tasa_no_show" ||
    value === "margen_contribucion"
  ) {
    return value;
  }

  throw new Error("KPI de meta no soportado para Fisioterapia MVP.");
}

function readTargetLifecycleStatus(
  value: unknown,
): PhysiotherapyTargetLifecycleStatus {
  return value === "inactive" ? "inactive" : "active";
}

export function upsertPhysiotherapyTarget(
  actor: AuthorizationActor,
  rawPayload: unknown,
) {
  if (!canManageTargets(actor)) {
    throw new Error("Este rol no puede configurar metas.");
  }

  const store = getStore();
  const payload = (typeof rawPayload === "object" && rawPayload !== null
    ? rawPayload
    : {}) as PhysiotherapyTargetPayload;
  const branchId = readString(payload.branchId);
  const branch = getBranchForPayload(actor, branchId);
  const period = readString(payload.period) || currentDemoPeriod;
  const kpiId = readTargetKpiId(payload.kpiId);
  const definition = targetableKpis[kpiId];
  const existingTargets = [...store.targets.values()].filter(
    (target) =>
      target.branchId === branch.id &&
      target.period === period &&
      target.kpiId === kpiId,
  );
  const version =
    Math.max(0, ...existingTargets.map((target) => target.version)) + 1;
  const direction = readTargetDirection(payload.direction, definition.direction);
  const targetValue = readNumber(payload.targetValue);

  if (!Number.isFinite(targetValue)) {
    throw new Error("La meta es obligatoria y debe ser numerica.");
  }

  if (targetValue < 0) {
    throw new Error("La meta debe ser cero o mayor.");
  }

  const targetMinValue = readNumber(payload.targetMinValue);
  const targetMaxValue = readNumber(payload.targetMaxValue);

  if (
    direction === "RANGE" &&
    (!Number.isFinite(targetMinValue) ||
      !Number.isFinite(targetMaxValue) ||
      targetMinValue > targetMaxValue)
  ) {
    throw new Error("El rango de meta debe tener minimo y maximo validos.");
  }

  const target: PhysiotherapyTarget = {
    approvedAt: nowIso(),
    approvedBy: actor.email,
    branchId: branch.id,
    companyId: branch.companyId,
    countryId: branch.countryId,
    direction,
    id: createTargetId(period, branch.id, kpiId, version),
    isDemo: true,
    kpiId,
    label: definition.label,
    period,
    status: readTargetLifecycleStatus(payload.status),
    targetMaxValue:
      direction === "RANGE" ? round(targetMaxValue, 4) : undefined,
    targetMinValue:
      direction === "RANGE" ? round(targetMinValue, 4) : undefined,
    targetValue: round(targetValue, 4),
    unit: definition.unit,
    version,
  };

  store.targets.set(target.id, target);

  return target;
}

function filterClosuresForActor(actor: AuthorizationActor) {
  const store = getStore();
  const allowedBranchIds = new Set(
    getPhysiotherapyBranchesForActor(actor).map((branch) => branch.id),
  );

  return [...store.closures.values()]
    .filter((closure) => allowedBranchIds.has(closure.scope.branchId ?? ""))
    .sort((left, right) =>
      `${right.period}-${right.version}`.localeCompare(
        `${left.period}-${left.version}`,
      ),
    );
}

function filterTargetsForActor(actor: AuthorizationActor) {
  const store = getStore();
  const allowedBranchIds = new Set(
    getPhysiotherapyBranchesForActor(actor).map((branch) => branch.id),
  );

  return [...store.targets.values()].filter((target) =>
    allowedBranchIds.has(target.branchId),
  );
}

function aggregateKpiValue(
  closures: PhysiotherapyClosure[],
  kpiId: PhysiotherapyTargetableKpiId,
) {
  if (closures.length === 0) {
    return null;
  }

  if (kpiId === "facturacion_neta") {
    return closures.reduce((sum, closure) => sum + closure.inputs.revenueTotal, 0);
  }

  if (kpiId === "sesiones_total") {
    return closures.reduce((sum, closure) => sum + closure.inputs.sessionsTotal, 0);
  }

  if (kpiId === "margen_contribucion") {
    return closures.reduce(
      (sum, closure) =>
        sum + closure.inputs.revenueTotal - closure.inputs.directCosts,
      0,
    );
  }

  if (kpiId === "ocupacion_efectiva") {
    const hours = closures.reduce(
      (summary, closure) => ({
        attended: summary.attended + closure.inputs.attendedHours,
        available: summary.available + closure.inputs.availableHours,
      }),
      { attended: 0, available: 0 },
    );

    return ratio(hours.attended, hours.available);
  }

  const appointments = closures.reduce(
    (summary, closure) => ({
      noShow: summary.noShow + closure.inputs.noShowAppointments,
      scheduled: summary.scheduled + closure.inputs.appointmentsScheduled,
    }),
    { noShow: 0, scheduled: 0 },
  );

  return ratio(appointments.noShow, appointments.scheduled);
}

function latestTargetsByBranchAndKpi(targets: PhysiotherapyTarget[]) {
  const latestTargets = new Map<string, PhysiotherapyTarget>();

  for (const target of targets) {
    const key = `${target.period}:${target.branchId}:${target.kpiId}`;
    const existingTarget = latestTargets.get(key);

    if (!existingTarget || target.version > existingTarget.version) {
      latestTargets.set(key, target);
    }
  }

  return latestTargets;
}

function aggregateTargetValue(
  closures: PhysiotherapyClosure[],
  targets: PhysiotherapyTarget[],
  kpiId: PhysiotherapyTargetableKpiId,
) {
  const latestTargets = latestTargetsByBranchAndKpi(targets);
  const closureTargets = closures
    .map((closure) =>
      latestTargets.get(`${closure.period}:${closure.scope.branchId}:${kpiId}`),
    )
    .filter(
      (target): target is PhysiotherapyTarget => target?.status === "active",
    );

  if (closureTargets.length === 0) {
    return null;
  }

  if (kpiId === "ocupacion_efectiva" || kpiId === "tasa_no_show") {
    return (
      closureTargets.reduce((sum, target) => sum + target.targetValue, 0) /
      closureTargets.length
    );
  }

  return closureTargets.reduce((sum, target) => sum + target.targetValue, 0);
}

function buildRollupComparisons(
  closures: PhysiotherapyClosure[],
  targets: PhysiotherapyTarget[],
) {
  return Object.entries(targetableKpis).map(([rawKpiId, definition]) => {
    const kpiId = rawKpiId as PhysiotherapyTargetableKpiId;
    const targetValue = aggregateTargetValue(closures, targets, kpiId);
    const actualValue = aggregateKpiValue(closures, kpiId);

    if (targetValue === null) {
      return {
        actualValue,
        complianceRate: null,
        direction: definition.direction,
        kpiId,
        label: definition.label,
        status: actualValue === null ? "not_calculable" : "sin_meta",
        targetValue: null,
        unit: definition.unit,
        variation: null,
      } satisfies PhysiotherapyTargetComparison;
    }

    const target: PhysiotherapyTarget = {
      approvedAt: "",
      approvedBy: "",
      branchId: "",
      companyId: "",
      countryId: "",
      direction: definition.direction,
      id: "aggregate",
      isDemo: true,
      kpiId,
      label: definition.label,
      period: closures[0]?.period ?? currentDemoPeriod,
      status: "active",
      targetValue,
      unit: definition.unit,
      version: 1,
    };

    return {
      actualValue,
      complianceRate: getComplianceRate({ actual: actualValue, target }),
      direction: definition.direction,
      kpiId,
      label: definition.label,
      status: getTargetStatus({ actual: actualValue, target }),
      targetValue,
      unit: definition.unit,
      variation: actualValue === null ? null : actualValue - targetValue,
    } satisfies PhysiotherapyTargetComparison;
  });
}

function buildRollupSummary(
  closures: PhysiotherapyClosure[],
  branchCount: number,
): PhysiotherapyRollupSummary {
  const revenue = closures.reduce(
    (sum, closure) => sum + closure.inputs.revenueTotal,
    0,
  );
  const revenueTarget = closures.reduce((sum, closure) => {
    const target = closure.targetComparisons.find(
      (comparison) => comparison.kpiId === "facturacion_neta",
    )?.targetValue;

    return target === null || target === undefined ? sum : sum + target;
  }, 0);
  const sessions = closures.reduce(
    (sum, closure) => sum + closure.inputs.sessionsTotal,
    0,
  );
  const patients = closures.reduce(
    (sum, closure) => sum + closure.inputs.patientsAttended,
    0,
  );
  const contributionMargin = closures.reduce(
    (sum, closure) =>
      sum + closure.inputs.revenueTotal - closure.inputs.directCosts,
    0,
  );
  const noShow = closures.reduce(
    (sum, closure) => sum + closure.inputs.noShowAppointments,
    0,
  );
  const appointments = closures.reduce(
    (sum, closure) => sum + closure.inputs.appointmentsScheduled,
    0,
  );
  const attendedHours = closures.reduce(
    (sum, closure) => sum + closure.inputs.attendedHours,
    0,
  );
  const availableHours = closures.reduce(
    (sum, closure) => sum + closure.inputs.availableHours,
    0,
  );
  const dataQualityScore =
    closures.length > 0
      ? closures.reduce((sum, closure) => sum + closure.dataQualityScore, 0) /
        closures.length
      : 0;

  return {
    branchCount,
    closuresPublished: closures.length,
    contributionMargin,
    dataQualityScore: round(dataQualityScore, 1),
    effectiveOccupancy: ratio(attendedHours, availableHours),
    noShowRate: ratio(noShow, appointments),
    patients,
    revenue,
    revenueCompliance:
      revenueTarget > 0 ? ratio(revenue, revenueTarget) : null,
    revenueTarget: revenueTarget > 0 ? revenueTarget : null,
    sessions,
  };
}

function targetByKpi(
  comparisons: PhysiotherapyTargetComparison[],
  kpiId: PhysiotherapyTargetableKpiId,
) {
  return comparisons.find((comparison) => comparison.kpiId === kpiId) ?? null;
}

function formatComparisonValue(
  comparison: PhysiotherapyTargetComparison | null,
) {
  if (!comparison || comparison.actualValue === null) {
    return "sin dato calculable";
  }

  if (comparison.unit === "currency") {
    return `$${Math.round(comparison.actualValue).toLocaleString("en-US")}`;
  }

  if (comparison.unit === "ratio") {
    return `${Math.round(comparison.actualValue * 100)}%`;
  }

  return Math.round(comparison.actualValue).toLocaleString("en-US");
}

function previousPublishedClosure(
  closure: PhysiotherapyClosure,
  closures: PhysiotherapyClosure[],
) {
  return (
    closures
      .filter(
        (candidate) =>
          candidate.status === "published" &&
          candidate.scope.branchId === closure.scope.branchId &&
          candidate.period < closure.period,
      )
      .sort((left, right) => right.period.localeCompare(left.period))[0] ?? null
  );
}

function buildInsightsForClosure(
  closure: PhysiotherapyClosure,
  allClosures: PhysiotherapyClosure[] = [],
): PhysiotherapyInsight[] {
  const insights: PhysiotherapyInsight[] = [];
  const previousClosure = previousPublishedClosure(closure, allClosures);
  const revenue = targetByKpi(closure.targetComparisons, "facturacion_neta");
  const noShow = targetByKpi(closure.targetComparisons, "tasa_no_show");
  const occupancy = targetByKpi(closure.targetComparisons, "ocupacion_efectiva");
  const margin = targetByKpi(closure.targetComparisons, "margen_contribucion");
  const scheduledOccupancy = getKpiValue(closure.kpiResults, "ocupacion_agendada");
  const effectiveOccupancy = getKpiValue(closure.kpiResults, "ocupacion_efectiva");
  const marginRate = getKpiValue(closure.kpiResults, "porcentaje_margen");
  const currentMargin = closure.inputs.revenueTotal - closure.inputs.directCosts;
  const previousMargin =
    previousClosure === null
      ? null
      : previousClosure.inputs.revenueTotal - previousClosure.inputs.directCosts;

  if (
    scheduledOccupancy !== null &&
    effectiveOccupancy !== null &&
    scheduledOccupancy >= 0.82 &&
    scheduledOccupancy - effectiveOccupancy >= 0.08
  ) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: `${Math.round(scheduledOccupancy * 100)}% agendada vs ${Math.round(effectiveOccupancy * 100)}% efectiva`,
      evidence:
        "La agenda comprometida no se convierte completa en horas atendidas.",
      id: `${closure.id}-agenda-gap`,
      impact: "Capacidad reservada sin produccion real.",
      kpiId: "brecha_conversion",
      period: closure.period,
      priority: "alta",
      recommendation:
        "Factores a revisar: confirmacion previa, lista de espera y causa de citas sin atencion.",
      title: "Agenda alta con conversion efectiva baja",
      whatHappened: "La ocupacion agendada supera a la ocupacion efectiva.",
    });
  }

  if (noShow?.status === "incumplido" || noShow?.status === "en_riesgo") {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: `${formatComparisonValue(noShow)} vs meta ${noShow.targetValue === null ? "sin meta" : `${Math.round(noShow.targetValue * 100)}%`}`,
      evidence:
        "El no-show se calcula desde citas no asistidas sobre citas agendadas.",
      id: `${closure.id}-no-show`,
      impact: "Riesgo de horas perdidas e ingreso no capturado.",
      kpiId: "tasa_no_show",
      period: closure.period,
      priority: noShow.status === "incumplido" ? "critica" : "alta",
      recommendation:
        "Factores a revisar: confirmacion 24 horas antes y recuperacion con lista de espera.",
      title: "No-show sobre meta",
      whatHappened: "La tasa de no-show supero el maximo aprobado.",
    });
  }

  if (revenue?.status === "incumplido" || revenue?.status === "en_riesgo") {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: `${formatComparisonValue(revenue)} vs meta ${revenue.targetValue === null ? "sin meta" : `$${Math.round(revenue.targetValue).toLocaleString("en-US")}`}`,
      evidence:
        "La facturacion proviene del cierre publicado y la meta aprobada del periodo.",
      id: `${closure.id}-revenue`,
      impact:
        revenue.variation === null
          ? "No se puede cuantificar brecha."
          : `$${Math.abs(Math.round(revenue.variation)).toLocaleString("en-US")} de brecha contra meta.`,
      kpiId: "facturacion_neta",
      period: closure.period,
      priority: revenue.status === "incumplido" ? "critica" : "alta",
      recommendation:
        "Factores a revisar: origen de ordenes, sesiones completadas y ticket promedio.",
      title: "Venta debajo de meta",
      whatHappened: "La facturacion publicada quedo debajo de la meta.",
    });
  }

  if (margin?.status === "incumplido" || margin?.status === "en_riesgo") {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: `${formatComparisonValue(margin)} vs meta ${margin.targetValue === null ? "sin meta" : `$${Math.round(margin.targetValue).toLocaleString("en-US")}`}`,
      evidence:
        "El margen de contribucion se calcula como facturacion menos costos directos.",
      id: `${closure.id}-margin`,
      impact:
        marginRate === null
          ? "Margen porcentual no calculable."
          : `Margen porcentual ${Math.round(marginRate * 100)}%.`,
      kpiId: "margen_contribucion",
      period: closure.period,
      priority: "alta",
      recommendation:
        "Factores a revisar: costos directos, compras extraordinarias y mix de servicios.",
      title: "Margen debajo de meta",
      whatHappened: "La contribucion quedo por debajo del nivel esperado.",
    });
  }

  if (
    previousClosure !== null &&
    previousMargin !== null &&
    previousClosure.inputs.revenueTotal > 0 &&
    closure.inputs.revenueTotal > previousClosure.inputs.revenueTotal * 1.03 &&
    currentMargin < previousMargin * 0.97
  ) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: `Venta actual $${Math.round(closure.inputs.revenueTotal).toLocaleString("en-US")} vs anterior $${Math.round(previousClosure.inputs.revenueTotal).toLocaleString("en-US")}; margen actual $${Math.round(currentMargin).toLocaleString("en-US")} vs anterior $${Math.round(previousMargin).toLocaleString("en-US")}`,
      evidence:
        "Comparacion deterministica entre cierre publicado actual y cierre publicado anterior de la misma sucursal.",
      id: `${closure.id}-revenue-up-margin-down`,
      impact: "Crecimiento con deterioro de rentabilidad.",
      kpiId: "margen_contribucion",
      period: closure.period,
      priority: "alta",
      recommendation:
        "Factores a revisar: costos directos, mix de servicios y promociones antes de concluir causalidad.",
      title: "Venta crece pero margen cae",
      whatHappened:
        "La facturacion subio frente al periodo anterior, pero el margen de contribucion bajo.",
    });
  }

  const occupancyActual = occupancy?.actualValue ?? null;
  const occupancyTarget = occupancy?.targetValue ?? null;

  if (occupancyActual !== null && occupancyTarget !== null && occupancyActual < 0.65) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: `${Math.round(occupancyActual * 100)}% de ocupacion efectiva`,
      evidence:
        "La ocupacion efectiva usa horas atendidas sobre horas disponibles.",
      id: `${closure.id}-idle-capacity`,
      impact: "Capacidad ociosa con espacio para recuperar produccion.",
      kpiId: "ocupacion_efectiva",
      period: closure.period,
      priority: "media",
      recommendation:
        "Factores a revisar: demanda por franja, agenda de continuidad y disponibilidad de fisioterapeutas.",
      title: "Capacidad ociosa",
      whatHappened: "La sucursal uso menos capacidad clinica de la esperada.",
    });
  }

  if (
    revenue?.status === "cumplido" &&
    occupancy?.status === "cumplido" &&
    noShow?.status === "cumplido" &&
    margin?.status === "cumplido"
  ) {
    insights.push({
      branchName: closure.scope.branchName,
      comparison: "Venta, ocupacion, no-show y margen cumplen simultaneamente.",
      evidence:
        "Los indicadores principales se calculan desde el mismo cierre publicado.",
      id: `${closure.id}-positive`,
      impact: "Sucursal candidata para documentar practica replicable.",
      kpiId: "facturacion_neta",
      period: closure.period,
      priority: "positiva",
      recommendation:
        "Revisar factores operativos para replicar en sucursales comparables.",
      title: "Cumplimiento integral positivo",
      whatHappened: "La sucursal cumplio los indicadores principales.",
    });
  }

  return insights;
}

function buildBranchSummaries(
  closures: PhysiotherapyClosure[],
): PhysiotherapyBranchSummary[] {
  return closures.map((closure) => {
    const revenueComparison = targetByKpi(
      closure.targetComparisons,
      "facturacion_neta",
    );

    return {
      areaManagerName: closure.scope.areaManagerName,
      areaName:
        demoOperationalAreas.find(
          (area) => area.id === closure.scope.operationalAreaId,
        )?.name ?? "Area pendiente",
      branchId: closure.scope.branchId ?? "",
      branchName: closure.scope.branchName,
      closureId: closure.id,
      contributionMargin:
        closure.inputs.revenueTotal - closure.inputs.directCosts,
      dataQualityScore: closure.dataQualityScore,
      effectiveOccupancy: getKpiValue(closure.kpiResults, "ocupacion_efectiva"),
      managerName: closure.scope.managerName,
      noShowRate: getKpiValue(closure.kpiResults, "tasa_no_show"),
      patients: closure.inputs.patientsAttended,
      period: closure.period,
      revenue: closure.inputs.revenueTotal,
      revenueCompliance: revenueComparison?.complianceRate ?? null,
      revenueTarget: revenueComparison?.targetValue ?? null,
      sessions: closure.inputs.sessionsTotal,
      status: closure.validation.state,
    };
  });
}

function getLatestPublishedPeriod(closures: PhysiotherapyClosure[]) {
  return (
    closures
      .filter((closure) => closure.status === "published")
      .sort((left, right) => right.period.localeCompare(left.period))[0]
      ?.period ?? currentDemoPeriod
  );
}

function currentPeriodStatus(
  closures: PhysiotherapyClosure[],
  currentPeriod: string,
) {
  if (
    closures.some(
      (closure) =>
        closure.period === currentPeriod && closure.status === "published",
    )
  ) {
    return "publicado";
  }

  if (
    closures.some(
      (closure) =>
        closure.period === currentPeriod && closure.status === "validated",
    )
  ) {
    return "validado";
  }

  if (
    closures.some(
      (closure) =>
        closure.period === currentPeriod &&
        (closure.status === "draft" ||
          closure.status === "validation_failed"),
    )
  ) {
    return "borrador";
  }

  return "sin_cierre";
}

export function getPhysiotherapyWorkspace(
  actor: AuthorizationActor,
  options: { period?: string } = {},
): PhysiotherapyWorkspace {
  const branches = getPhysiotherapyBranchesForActor(actor);
  const closures = filterClosuresForActor(actor);
  const targets = filterTargetsForActor(actor);
  const currentPeriod = currentDemoPeriod;
  const reportingPeriod =
    options.period && isValidPeriod(options.period)
      ? options.period
      : getLatestPublishedPeriod(closures);
  const publishedClosures = closures.filter(
    (closure) =>
      closure.status === "published" && closure.period === reportingPeriod,
  );
  const draftClosure =
    closures.find(
      (closure) =>
        closure.period === currentPeriod &&
        (closure.status === "draft" ||
          closure.status === "validation_failed" ||
          closure.status === "validated"),
    ) ?? null;
  const latestPublishedClosure =
    publishedClosures[0] ??
    closures.find((closure) => closure.status === "published") ??
    null;
  const targetComparisons = buildRollupComparisons(publishedClosures, targets);
  const summary = buildRollupSummary(publishedClosures, branches.length);
  const pendingClosureCount = branches.filter(
    (branch) =>
      !closures.some(
        (closure) =>
          closure.scope.branchId === branch.id &&
          closure.period === currentPeriod &&
          closure.status === "published",
      ),
  ).length;

  return {
    actorRole: actor.roleKey,
    auditEvents: [...getStore().auditEvents]
      .filter((event) => branches.some((branch) => branch.id === event.branchId))
      .slice(0, 30),
    branches: branches.map(toClosureScope),
    branchSummaries: buildBranchSummaries(publishedClosures),
    canCreateClosure: canWriteClosure(actor),
    canManageTargets: canManageTargets(actor),
    canPublishClosure: canWriteClosure(actor),
    closures,
    currentPeriod,
    currentPeriodStatus: currentPeriodStatus(closures, currentPeriod),
    draftClosure,
    insights: publishedClosures.flatMap((closure) =>
      buildInsightsForClosure(closure, closures),
    ),
    latestPublishedClosure,
    pendingClosureCount,
    publishedClosures,
    reportingPeriod,
    summary,
    targetComparisons,
    targets,
  };
}

export function getPhysiotherapyTargetDefinitions() {
  return targetableKpis;
}
