import {
  getManualMonthlyFormStepsForLine,
  type ImportBusinessLine,
} from "@/lib/analytics/import-operations";

export const productiveBusinessLines = [
  "Laboratorio",
  "Fisioterapia",
  "Imagenes",
] as const;

export type ProductiveBusinessLine = (typeof productiveBusinessLines)[number];
export type ManualSubmissionAction = "publish" | "save";

export type ManualSubmissionInput = {
  action: ManualSubmissionAction;
  answers: Record<string, string>;
  branchId: string;
  businessLine: ProductiveBusinessLine;
  expectedVersion?: number;
  period: string;
  qualityScore: number;
  validationResults: ManualValidationResult[];
};

export type ManualValidationResult = {
  code: string;
  fieldId?: string;
  message: string;
  severity: "BLOCKING" | "WARNING";
};

export type ManualSubmissionValidation = {
  input: ManualSubmissionInput | null;
  errors: string[];
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const forbiddenFieldPattern = /(password|contrasena|token|cookie|telefono|phone|email|correo|patient_(id|name|nombre|document|documento|record|expediente)|paciente_(id|name|nombre|document|documento|record|expediente))/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAnswers(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const entries = Object.entries(value);

  if (entries.length > 250) {
    return null;
  }

  const answers: Record<string, string> = {};

  for (const [key, rawValue] of entries) {
    if (
      forbiddenFieldPattern.test(key) ||
      typeof rawValue !== "string" ||
      key.length > 100 ||
      rawValue.length > 2_000
    ) {
      return null;
    }

    answers[key] = rawValue.trim();
  }

  return answers;
}

function evaluateAnswers(
  businessLine: ImportBusinessLine,
  answers: Record<string, string>,
) {
  const fields = getManualMonthlyFormStepsForLine(businessLine).flatMap(
    (step) => step.fields,
  );
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const results: ManualValidationResult[] = [];

  for (const fieldId of Object.keys(answers)) {
    if (!fieldById.has(fieldId)) {
      results.push({
        code: "UNKNOWN_FIELD",
        fieldId,
        message: "El campo no pertenece al formulario autorizado.",
        severity: "BLOCKING",
      });
    }
  }

  for (const field of fields) {
    const value = answers[field.id]?.trim() ?? "";

    if (field.required && !value) {
      results.push({
        code: "REQUIRED_FIELD_MISSING",
        fieldId: field.id,
        message: `${field.label} es obligatorio.`,
        severity: "BLOCKING",
      });
      continue;
    }

    if (!value) continue;

    if (["currency", "number", "percent"].includes(field.inputType)) {
      const numericValue = Number(value.replace(/,/g, ""));
      const minimum = field.min ?? 0;
      const maximum = field.max ?? (field.inputType === "percent" ? 100 : null);

      if (
        !Number.isFinite(numericValue) ||
        numericValue < minimum ||
        (maximum !== null && numericValue > maximum)
      ) {
        results.push({
          code: "INVALID_NUMERIC_RANGE",
          fieldId: field.id,
          message: `${field.label} contiene un numero fuera del rango permitido.`,
          severity: "BLOCKING",
        });
      }
    }

    if (field.inputType === "month" && !monthPattern.test(value)) {
      results.push({
        code: "INVALID_MONTH",
        fieldId: field.id,
        message: `${field.label} debe usar el formato AAAA-MM.`,
        severity: "BLOCKING",
      });
    }

    if (field.inputType === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      results.push({
        code: "INVALID_DATE",
        fieldId: field.id,
        message: `${field.label} debe usar una fecha valida.`,
        severity: "BLOCKING",
      });
    }
  }

  const blockingCount = results.filter(
    (result) => result.severity === "BLOCKING",
  ).length;

  return {
    qualityScore: Math.max(0, 94 - blockingCount * 10),
    results,
  };
}

export function validateManualSubmission(value: unknown): ManualSubmissionValidation {
  if (!isRecord(value)) {
    return { errors: ["Solicitud invalida."], input: null };
  }

  const action = value.action;
  const branchId = value.branchId;
  const businessLine = value.businessLine;
  const period = value.period;
  const expectedVersion = value.expectedVersion;
  const answers = normalizeAnswers(value.answers);
  const normalizedAction = action === "save" || action === "publish" ? action : null;
  const normalizedBranchId = typeof branchId === "string" && uuidPattern.test(branchId) ? branchId : null;
  const normalizedBusinessLine = productiveBusinessLines.find((line) => line === businessLine) ?? null;
  const normalizedPeriod = typeof period === "string" && monthPattern.test(period) ? period : null;
  const normalizedExpectedVersion = expectedVersion === undefined
    ? undefined
    : typeof expectedVersion === "number" &&
        Number.isInteger(expectedVersion) &&
        expectedVersion > 0
      ? expectedVersion
      : null;
  const errors: string[] = [];

  if (!normalizedAction) errors.push("Accion invalida.");
  if (!normalizedBranchId) errors.push("Sucursal invalida.");
  if (!normalizedBusinessLine) errors.push("Linea de negocio invalida.");
  if (!normalizedPeriod) errors.push("Periodo invalido.");
  if (normalizedExpectedVersion === null) errors.push("Version esperada invalida.");
  if (!answers) errors.push("Respuestas invalidas o contienen campos sensibles.");

  if (
    errors.length > 0 ||
    !answers ||
    !normalizedAction ||
    !normalizedBranchId ||
    !normalizedBusinessLine ||
    !normalizedPeriod ||
    normalizedExpectedVersion === null
  ) {
    return { errors, input: null };
  }

  const evaluation = evaluateAnswers(normalizedBusinessLine, answers);
  const blockingResults = evaluation.results.filter(
    (result) => result.severity === "BLOCKING",
  );
  const structuralErrors = blockingResults.filter(
    (result) => result.code !== "REQUIRED_FIELD_MISSING",
  );

  if (structuralErrors.length > 0) {
    errors.push(
      `La validacion del servidor encontro ${structuralErrors.length} campos invalidos.`,
    );
  }

  if (
    normalizedAction === "publish" &&
    blockingResults.length > structuralErrors.length
  ) {
    errors.push(
      `La validacion del servidor encontro ${blockingResults.length} errores bloqueantes.`,
    );
  }

  if (normalizedAction === "publish" && evaluation.qualityScore < 70) {
    errors.push("El score calculado por el servidor debe ser al menos 70 para publicar.");
  }

  if (errors.length > 0) return { errors, input: null };

  return {
    errors: [],
    input: {
      action: normalizedAction,
      answers,
      branchId: normalizedBranchId,
      businessLine: normalizedBusinessLine,
      expectedVersion: normalizedExpectedVersion,
      period: normalizedPeriod,
      qualityScore: evaluation.qualityScore,
      validationResults: evaluation.results,
    },
  };
}
