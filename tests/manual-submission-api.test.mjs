import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/manual-submissions/route.ts", "utf8");
const dashboard = readFileSync(
  "components/manual-monthly-entry-dashboard.tsx",
  "utf8",
);
const readinessRoute = readFileSync(
  "app/api/manual-submissions/readiness/route.ts",
  "utf8",
);
const validation = readFileSync("lib/manual-submissions/validation.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260804000200_manual_monthly_submissions.sql",
  "utf8",
);

for (const expected of [
  "getAuthenticatedUser",
  "withDatabaseTransaction",
  "Sucursal fuera de tu alcance",
  "manual_monthly_submission_versions",
  "manual_monthly_submission_events",
  "export async function GET",
  "limit 50",
  "Solo un administrador puede reemplazar un cierre publicado",
]) {
  assert.match(route, new RegExp(expected));
}

for (const expected of [
  "ProductiveManualSubmission",
  "Borrador productivo recuperado",
  "/api/manual-submissions?${query.toString()}",
  "Historial productivo",
  "nunca se combina con el historial productivo",
]) {
  assert.ok(dashboard.includes(expected));
}

for (const expected of [
  "getManualMonthlyFormStepsForLine",
  "normalizedQualityScore < 70",
  "forbiddenFieldPattern",
  "Faltan ${missingFields.length} campos obligatorios",
]) {
  assert.ok(validation.includes(expected));
}

assert.match(migration, /unique \(organization_id, branch_id, business_line, period\)/);
assert.match(migration, /status.*PUBLISHED/);
assert.match(migration, /answers jsonb not null/);
assert.match(migration, /created_by uuid not null/);

for (const expected of [
  "queryDatabase",
  "to_regclass('public.manual_monthly_submissions')",
  "Cache-Control",
  "status: ready ? 200 : 503",
]) {
  assert.ok(readinessRoute.includes(expected));
}

assert.ok(!readinessRoute.includes("error.message"));

console.log("Manual submission API checks passed.");
