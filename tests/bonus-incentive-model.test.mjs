import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

function read(path) {
  statSync(path);
  return readFileSync(path, "utf8");
}

const proposal = read("docs/bonuses/bonus-model-proposal.md");
const analytics = read("lib/analytics/manager-bonuses.ts");
const dashboard = read("components/manager-bonus-dashboard.tsx");
const navigation = read("lib/navigation.ts");
const packageJson = read("package.json");

for (const requiredProposalText of [
  "USD 100",
  "USD 200",
  "ELIGIBLE",
  "REVIEW REQUIRED",
  "NOT ELIGIBLE",
  "SYSTEM RECOMMENDS",
  "ADJUSTED WITH REASON",
  "No pagar por ingresos absolutos solamente",
  "Gerente de Area",
]) {
  assert.ok(
    proposal.includes(requiredProposalText),
    `Bonus proposal is missing: ${requiredProposalText}`,
  );
}

for (const requiredAnalyticsText of [
  'export type BonusState =',
  '"ELIGIBLE"',
  '"REVIEW REQUIRED"',
  '"NOT ELIGIBLE"',
  'export type BonusApprovalStatus =',
  '"SYSTEM RECOMMENDS"',
  '"APPROVED"',
  '"REJECTED"',
  '"ADJUSTED WITH REASON"',
  'export type ManagerRole = "Gerente de Sucursal" | "Gerente de Area"',
  'function getBonusBand(score: number)',
  "return { amount: 200, band: \"Exceptional\" }",
  "return { amount: 175, band: \"Outstanding\" }",
  "return { amount: 150, band: \"High\" }",
  "return { amount: 125, band: \"Strong\" }",
  "return { amount: 100, band: \"Satisfactory\" }",
  "bonusPotential = 200",
  "bonusApproved = 0",
  "bonusPaid = 0",
  "buildAreaManagerBonusRecords",
  "getManagerBonusBacktest",
]) {
  assert.ok(
    analytics.includes(requiredAnalyticsText),
    `Bonus analytics is missing: ${requiredAnalyticsText}`,
  );
}

for (const requiredWeightText of [
  '{ dimension: "Finanzas", weight: 25 }',
  '{ dimension: "Operacion", weight: 30 }',
  '{ dimension: "Finanzas", weight: 30 }',
  '{ dimension: "Operacion", weight: 25 }',
  '{ dimension: "Finanzas", weight: 28 }',
  '{ dimension: "Operacion", weight: 27 }',
  '{ dimension: "Metas", weight: 20 }',
  '{ dimension: "Eficiencia/calidad", weight: 15 }',
  '{ dimension: "Calidad dato", weight: 10 }',
]) {
  assert.ok(
    analytics.includes(requiredWeightText),
    `Bonus weights are missing: ${requiredWeightText}`,
  );
}

for (const requiredDashboardText of [
  "Estado del bono",
  "Rol evaluado",
  "Bono recomendado",
  "Bono final",
  "Por que recibo este bono",
  "Backtest de politica de bonos",
  "El sistema calcula puntaje y bono recomendado",
  "La decision queda como aprobada, rechazada o ajustada con motivo",
  "Aprobacion auditable de bono",
  "Aprobar",
  "Ajustar",
  "Rechazar",
  "No ejecuta pagos",
]) {
  assert.ok(
    dashboard.includes(requiredDashboardText),
    `Bonus dashboard is missing: ${requiredDashboardText}`,
  );
}

assert.ok(
  packageJson.includes("tests/bonus-incentive-model.test.mjs"),
  "Bonus test must be part of npm test.",
);

const managerBonusNavigation = navigation.match(
  /title: "Gerentes y bonos"[\s\S]*?allowedRoles: \[([\s\S]*?)\]/,
)?.[1];

assert.ok(managerBonusNavigation, "Manager bonus navigation entry is missing.");

for (const requiredRole of [
  "...adminRoles",
  '"ceo"',
  '"gerente_operaciones"',
  '"gerente_area"',
]) {
  assert.ok(
    managerBonusNavigation.includes(requiredRole),
    `Manager bonus navigation is missing read access for ${requiredRole}.`,
  );
}

assert.ok(
  !managerBonusNavigation.includes('"gerente_sucursal"'),
  "Branch manager must not see the manager bonus module.",
);

assert.ok(
  packageJson.includes("tests/bonus-workflow.test.mjs"),
  "Bonus workflow test must be part of npm test.",
);

console.log("Bonus incentive model checks passed.");
