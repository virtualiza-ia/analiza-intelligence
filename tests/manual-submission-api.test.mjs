import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/manual-submissions/route.ts", "utf8");
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
]) {
  assert.match(route, new RegExp(expected));
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

console.log("Manual submission API checks passed.");
