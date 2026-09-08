import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readWorkspaceFile(path) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function fieldBlock(source, fieldId) {
  const start = source.indexOf(`id: "${fieldId}"`);
  assert(start >= 0, `Field ${fieldId} must exist.`);
  const end = source.indexOf("\n      },", start);

  return source.slice(start, end > start ? end : undefined);
}

function assertFieldContains(source, fieldId, snippets) {
  const block = fieldBlock(source, fieldId);

  for (const snippet of snippets) {
    assert(
      block.includes(snippet),
      `Field ${fieldId} must include ${snippet}.`,
    );
  }
}

const componentPath = "components/manual-monthly-entry-dashboard.tsx";
const component = readWorkspaceFile(componentPath);
const importDashboard = readWorkspaceFile(
  "components/import-operations-dashboard.tsx",
);
const importOperations = readWorkspaceFile("lib/analytics/import-operations.ts");
const managedBranches = readWorkspaceFile("lib/tenant/managed-branch-records.ts");
const demoContext = readWorkspaceFile("lib/tenant/demo-context.ts");
const modulePage = readWorkspaceFile("app/protected/[module]/page.tsx");
const newClosurePage = readWorkspaceFile("app/protected/cierres/nuevo/page.tsx");
const navigation = readWorkspaceFile("lib/navigation.ts");
const packageJson = readWorkspaceFile("package.json");
const documentationExists = existsSync(join(root, "docs/manual-monthly-entry.md"));

assert(
  component.includes("Llena el cierre mensual de la sucursal"),
  "Manual monthly dashboard must expose the monthly closing form.",
);
assert(
  component.includes("Formulario en curso") &&
    component.includes("Resumen para publicar") &&
    component.includes("Control de carga"),
  "Manual monthly dashboard must present the form as a friendly closing wizard.",
);
assert(
  component.includes("analiza:manual-monthly-history"),
  "Manual monthly dashboard must persist DEMO history locally.",
);
assert(
  component.includes("Guardar avance DEMO") &&
    component.includes("Publicar cierre DEMO"),
  "Manual monthly dashboard must support draft and publish actions.",
);
assert(
  component.includes("useActiveBusinessLine"),
  "Manual monthly dashboard must be driven by the selected business line.",
);
assert(
  component.includes("demoBranches") &&
    component.includes("getBranchOptionsForLine") &&
    component.includes("Selecciona una sucursal") &&
    component.includes("areaManagerName") &&
    component.includes("branchManagerName"),
  "Manual monthly dashboard must render branch_reported as a branch selector.",
);
assert(
  component.includes("getBranchManagerOptions") &&
    component.includes("getAreaManagerOptions") &&
    component.includes('field.id === "manager_name"') &&
    component.includes('field.id === "area_manager_name"'),
  "Manual monthly dashboard must render branch and area managers as selectors.",
);
assert(
  component.includes("getMonthlyLoadDeadline") &&
    component.includes("2026-08-04") &&
    component.includes("monthValue, 4") &&
    component.includes("edit_authorization_code") &&
    component.includes("Ese cierre ya fue publicado"),
  "Manual monthly dashboard must enforce deadline and edit authorization rules.",
);
assert(
  component.includes("disabled={readOnly && isSystemDateField}") &&
    component.includes('"data_cutoff_date"') &&
    component.includes('"load_deadline_date"'),
  "Manual monthly dashboard must lock system-owned cutoff and deadline dates.",
);
assert(
  component.includes("scopedHistoryEntries") &&
    component.includes("No se") &&
    component.includes("muestran registros de otras sucursales"),
  "Manual monthly dashboard must scope YTD and history to the selected branch.",
);
assert(
  component.includes("scrollFormToTop") &&
    component.includes("requestAnimationFrame"),
  "Manual monthly dashboard must return to the form top when changing steps.",
);
assert(
  importDashboard.includes("MonthlyFormEntry") &&
    importDashboard.includes("OfficialMonthlyClosureForm") &&
    importDashboard.includes("LaboratoryVerticalDashboard") &&
    importDashboard.includes("PhysiotherapyVerticalDashboard") &&
    importDashboard.includes("ImagingVerticalDashboard"),
  "Import operations must render official monthly closure forms outside DEMO.",
);
assert(
  importDashboard.includes('isDemoEnvironment || roleKey === "gerente_area"') &&
    importDashboard.includes("<ManualMonthlyEntryDashboard") &&
    importDashboard.includes("actorScope={actorScope}"),
  "Import operations must keep the manual monthly dashboard for DEMO and area manager imports.",
);
assert(
  importDashboard.includes("actorScope?: ScopeBoundary") &&
    importDashboard.includes('roleKey !== "gerente_area"') &&
    importDashboard.includes("getLineOptionsForRole") &&
    importDashboard.includes("includeConsolidatedImports = roleKey !== \"gerente_area\"") &&
    importDashboard.includes("isAllScopeLabel") &&
    importDashboard.includes("areaManagerImportView") &&
    importDashboard.includes("&& !areaManagerImportView") &&
    importDashboard.includes("monthlyFormContent") &&
    importDashboard.includes("No hay linea operativa autorizada para este alcance."),
  "Import operations must limit area managers to their assigned line and hide central import operations.",
);
assert(
  component.includes("type ManualMonthlyEntryDashboardProps") &&
    component.includes("actorScope?: ScopeBoundary") &&
    component.includes("roleKey ?? readActiveDemoRole()") &&
    component.includes("branchMatchesAreaScope") &&
    component.includes('activeRole === "gerente_area"'),
  "Manual monthly fallback must use server role and area scope when provided.",
);
assert(
  component.includes("showLoadControlPanel") &&
    component.includes('activeRole !== "gerente_area"') &&
    component.includes("Carga mensual por sucursal") &&
    component.includes("Excel operativo"),
  "Area manager imports must hide load-control surfaces and only describe the authorized monthly Excel load.",
);
assert(
  modulePage.includes('module === "importaciones"') &&
    modulePage.includes("ImportOperationsDashboard") &&
    modulePage.includes("actorScope={actor.scope}") &&
    modulePage.includes("ManagerBonusDashboard") &&
    modulePage.includes("BranchNetworkDashboard") &&
    modulePage.includes('actor.roleKey === "gerente_area"') &&
    modulePage.includes('module === "plantillas"') &&
    modulePage.includes("MonthlyClosureRouter"),
  "Importaciones must render the import dashboard while area managers keep rich Gerentes and Sucursales dashboards.",
);
assert(
  newClosurePage.includes('from "next/navigation"') &&
    newClosurePage.includes("/protected/plantillas") &&
    newClosurePage.includes("/protected/importaciones"),
  "The legacy new closure route must send branch operators to Formulario mensual and operations to Importaciones.",
);
assert(
  navigation.includes('title: "Importaciones"') &&
    navigation.includes('href: "/protected/importaciones"') &&
    navigation.includes('title: "Formulario mensual"') &&
    navigation.includes('href: "/protected/plantillas"') &&
    !navigation.includes('title: "Nuevo cierre mensual"'),
  "Navigation must separate Importaciones from the branch monthly form.",
);
assert(
  importOperations.includes("manualMonthlyFormSteps") &&
    importOperations.includes("manualMonthlyHistory"),
  "Import operations data model must include form steps and history.",
);

for (const businessLine of ["Laboratorio", "Fisioterapia", "Imagenes"]) {
  assert(
    importOperations.includes(`businessLine: "${businessLine}"`) ||
      importOperations.includes(`appliesTo: ["${businessLine}"]`),
    `Manual monthly model must include ${businessLine}.`,
  );
}

assert(
  importOperations.includes("sourceTrace"),
  "Manual monthly history must preserve source traceability.",
);
assert(
  importOperations.includes("area_manager_name") &&
    importOperations.includes("load_deadline_date") &&
    importOperations.includes("team_feedback_score"),
  "Manual monthly form must include area manager, deadline, and 360 evaluation fields.",
);
const requiredLabDataFields = [
  "period",
  "branch_reported",
  "manager_name",
  "area_manager_name",
  "area_zone",
  "data_cutoff_date",
  "load_deadline_date",
  "lab_financial_target",
  "lab_total_sales",
  "lab_cost_of_sale",
  "lab_medical_order_sales",
  "lab_medical_order_count",
  "lab_analiza_patient_sales",
  "lab_analiza_order_count",
  "lab_drsv_patient_sales",
  "lab_drsv_order_count",
  "lab_home_visit_sales",
  "lab_home_visit_count",
  "lab_total_orders",
  "lab_total_clients",
  "lab_analiza_clients",
  "lab_drsv_clients",
  "lab_rent_expense",
  "lab_personnel_expense",
  "lab_social_security_expense",
  "lab_energy_expense",
  "lab_water_expense",
  "lab_internet_expense",
  "lab_petty_cash_expense",
  "lab_electronic_security_expense",
  "lab_transae_expense",
  "lab_municipality_expense",
  "lab_call_center_operating_costs",
  "lab_company_operating_costs",
  "lab_phlebotomists_count",
  "lab_customer_service_count",
  "lab_nurses_count",
  "lab_technical_area_count",
  "lab_cleaning_security_count",
  "inventory_reactives_quantity",
  "inventory_reactives_amount",
  "inventory_consumables_quantity",
  "inventory_consumables_amount",
  "inventory_supplies_quantity",
  "inventory_supplies_amount",
];
assert(
  requiredLabDataFields.length === 45,
  "Laboratorio form must define exactly 45 required data fields.",
);
for (const requiredLabField of requiredLabDataFields) {
  assertFieldContains(importOperations, requiredLabField, ["required: true"]);
}
for (const requiredLabText of [
  "Archivos y publicacion",
  "Adjunta minimo 1 y maximo 2 archivos",
  "campos obligatorios al 100%",
  "version guardada",
  "al menos un Excel/CSV",
  "sin archivos bloqueados",
  "medical_exam_sales_file",
  "lab_supporting_evidence_file",
  "change_reason",
  "requiredForPublish: true",
  "Cierre inicial",
  "Correccion de datos",
  "Actualizacion de costos",
  "Actualizacion de evidencia",
  "Revision solicitada",
  "Reapertura autorizada",
  "Comunicacion interna",
  "Servicio al cliente",
  "Procesos y tiempos",
  "Carga de trabajo",
  "Capacitacion",
  "Liderazgo",
  "Sin hallazgos relevantes",
  "Sin accion adicional",
  "Reconocimiento al equipo",
]) {
  assert(
    importOperations.includes(requiredLabText),
    `Laboratorio form must include publication or 360 text: ${requiredLabText}.`,
  );
}
assertFieldContains(importOperations, "medical_exam_sales_file", [
  "required: false",
  "requiredForPublish: true",
  'accept: ".xlsx,.xls,.csv"',
]);
assertFieldContains(importOperations, "lab_supporting_evidence_file", [
  "required: false",
  'accept: ".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.xls,.csv"',
]);
assertFieldContains(importOperations, "change_reason", [
  'inputType: "select"',
  "required: false",
  "requiredForPublish: true",
]);
assert(
  component.includes("getLabPublishBlockers") &&
    component.includes("isSpreadsheetFileName") &&
    component.includes("savedDraftSignature") &&
    component.includes("requiredFields.length") &&
    component.includes("1-2 adjuntos validos y al menos un Excel/CSV"),
  "Manual monthly dashboard must enforce Laboratorio publish conditions separately from the 45 required data fields.",
);
for (const retiredLabField of [
  "lab_unique_clients",
  "lab_new_clients",
  "lab_recurring_clients",
  "lab_orders_per_client",
  "lab_tests",
  "lab_goal_completion_rate",
  "lab_sales_without_tax",
  "lab_margin_rate",
  "lab_margin_amount",
  "lab_operating_profit",
  "lab_no_doctor_patient_sales",
  "lab_no_doctor_order_count",
  "lab_profiles_total",
  "doctors_sales_file",
  "medical_reps_sales_file",
]) {
  assert(
    !importOperations.includes(retiredLabField),
    `Laboratorio form must not keep retired generic field ${retiredLabField}.`,
  );
}
assert(
  demoContext.includes("gerente_area") &&
    demoContext.includes("managedDemoBranches"),
  "Demo context must expose area manager role and managed branch catalog.",
);
assert(
  managedBranches.includes("managedBranchRecords") &&
    managedBranches.includes("Ana Maria Rivera Monroy") &&
    managedBranches.includes("Katherine Leonardo") &&
    managedBranches.includes("LABORATORY") &&
    managedBranches.includes("IMAGING") &&
    managedBranches.includes("PHYSIOTHERAPY"),
  "Managed branch catalog must preserve branches, branch managers, area managers, and lines from the workbook.",
);
assert(
  documentationExists,
  "Manual monthly entry decision must be documented.",
);
assert(
  packageJson.includes("manual-monthly-entry.test.mjs"),
  "The manual monthly entry test must run in npm test.",
);
