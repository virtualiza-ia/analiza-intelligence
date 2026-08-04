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
  period: string;
  qualityScore: number;
};

export type ManualSubmissionValidation = {
  input: ManualSubmissionInput | null;
  errors: string[];
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const forbiddenFieldPattern = /(patient|paciente|password|contrasena|token|cookie|telefono|phone|email|correo)/i;

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

export function validateManualSubmission(value: unknown): ManualSubmissionValidation {
  if (!isRecord(value)) {
    return { errors: ["Solicitud invalida."], input: null };
  }

  const action = value.action;
  const branchId = value.branchId;
  const businessLine = value.businessLine;
  const period = value.period;
  const qualityScore = value.qualityScore;
  const answers = normalizeAnswers(value.answers);
  const normalizedAction = action === "save" || action === "publish" ? action : null;
  const normalizedBranchId = typeof branchId === "string" && uuidPattern.test(branchId) ? branchId : null;
  const normalizedBusinessLine = productiveBusinessLines.find((line) => line === businessLine) ?? null;
  const normalizedPeriod = typeof period === "string" && monthPattern.test(period) ? period : null;
  const normalizedQualityScore =
    typeof qualityScore === "number" &&
    Number.isInteger(qualityScore) &&
    qualityScore >= 0 &&
    qualityScore <= 100
      ? qualityScore
      : null;
  const errors: string[] = [];

  if (!normalizedAction) errors.push("Accion invalida.");
  if (!normalizedBranchId) errors.push("Sucursal invalida.");
  if (!normalizedBusinessLine) errors.push("Linea de negocio invalida.");
  if (!normalizedPeriod) errors.push("Periodo invalido.");
  if (normalizedQualityScore === null) errors.push("Score de calidad invalido.");
  if (!answers) errors.push("Respuestas invalidas o contienen campos sensibles.");

  if (
    errors.length > 0 ||
    !answers ||
    !normalizedAction ||
    !normalizedBranchId ||
    !normalizedBusinessLine ||
    !normalizedPeriod ||
    normalizedQualityScore === null
  ) {
    return { errors, input: null };
  }

  if (normalizedAction === "publish") {
    const requiredFields = getManualMonthlyFormStepsForLine(
      normalizedBusinessLine as ImportBusinessLine,
    ).flatMap((step) => step.fields.filter((field) => field.required));
    const missingFields = requiredFields.filter((field) => !answers[field.id]?.trim());

    if (missingFields.length > 0) errors.push(`Faltan ${missingFields.length} campos obligatorios.`);
    if (normalizedQualityScore < 70) errors.push("El score de calidad debe ser al menos 70 para publicar.");
  }

  if (errors.length > 0) return { errors, input: null };

  return {
    errors: [],
    input: {
      action: normalizedAction,
      answers,
      branchId: normalizedBranchId,
      businessLine: normalizedBusinessLine,
      period: normalizedPeriod,
      qualityScore: normalizedQualityScore,
    },
  };
}
