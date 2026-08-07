import { readFileSync, statSync } from "node:fs";

function read(path) {
  statSync(path);
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const packageJson = read("package.json");
const navigation = read("lib/navigation.ts");
const modulePage = read("app/protected/[module]/page.tsx");
const executiveDashboard = read("components/executive-dashboard.tsx");
const managerDashboard = read("components/manager-bonus-dashboard.tsx");
const importsDashboard = read("components/import-operations-dashboard.tsx");
const connectorsDashboard = read("components/crm-connectors-dashboard.tsx");
const physioDashboard = read("components/physiotherapy-presentation-dashboard.tsx");
const laboratoryDashboard = read("components/laboratory-presentation-dashboard.tsx");
const imagingDashboard = read("components/imaging-presentation-dashboard.tsx");
const designSystem = read("docs/design-system.md");
const checklist = read("docs/production-readiness-checklist.md");
const demoScript = read("docs/executive-demo-script.md");
const knownRisks = read("docs/known-risks.md");
const architecture = read("docs/architecture-current.md");
const roadmap = read("docs/production-readiness-roadmap.md");

assert(
  packageJson.includes("\"dev\": \"next dev --webpack\""),
  "Local dev must use webpack until Turbopack CSS parsing is resolved.",
);

assert(
  navigation.includes("APIs e integraciones") &&
    navigation.includes("href: \"/protected/apis\""),
  "Navigation must define /protected/apis explicitly.",
);

assert(
  modulePage.includes('module === "conectores" || module === "apis"'),
  "Dynamic module route must resolve /protected/apis to connectors.",
);

for (const requiredText of [
  "Executive Command Center",
  "Calidad del dato",
  "Tarjetas principales del Executive Command Center",
  "Requiere su atencion",
  "Ingresos",
  "Cumplimiento meta",
  "Margen de contribucion",
  "Pacientes/clientes atendidos",
  "Ocupacion agendada",
  "Ocupacion efectiva",
  "Citas completadas",
  "No-show",
  "Capacidad disponible",
  "Cuentas por cobrar",
  "Formula:",
  "md:hidden",
]) {
  assert(
    executiveDashboard.includes(requiredText),
    `Executive dashboard is missing: ${requiredText}`,
  );
}

for (const requiredManagerText of [
  "Rendimiento ejecutivo de gerentes",
  "Gerente Operaciones",
  "Gerente Area",
  "Gerente Sucursal",
  "Ingresos vs meta",
  "Ocupacion efectiva",
  "Finalizacion/SLA",
  "No-show",
  "No calculable sin agenda por gerente",
  "Productividad",
  "Margen",
  "Calidad",
  "Score ejecutivo no concluyente",
]) {
  assert(
    managerDashboard.includes(requiredManagerText),
    `Manager dashboard is missing: ${requiredManagerText}`,
  );
}

for (const requiredImportText of [
  "ImportPipelineStepper",
  "Upload",
  "Mapping",
  "Validacion",
  "Preview",
  "Publish",
  "Lineage",
  "RAW inmutable",
  "PUBLISHED",
]) {
  assert(
    importsDashboard.includes(requiredImportText),
    `Import UX is missing: ${requiredImportText}`,
  );
}

for (const requiredConnectorText of [
  "Supervisa endpoints",
  "Credenciales reales solo en servidor",
  "No se debe pegar una llave real",
  "Sin configurar",
  "Freshness",
  "Fallback sin conector",
  "md:hidden",
]) {
  assert(
    connectorsDashboard.includes(requiredConnectorText),
    `Connectors UX is missing: ${requiredConnectorText}`,
  );
}

assert(
  !connectorsDashboard.includes("Genera llaves DEMO"),
  "Connectors dashboard must not tell users to generate demo keys in browser.",
);

for (const requiredPhysioText of [
  "Lectura clinica de Fisioterapia",
  "Horas disponibles",
  "Horas agendadas",
  "Horas atendidas",
  "Sesiones",
  "No-show",
  "Ingreso/hora",
  "Utilizacion por fisioterapeuta",
]) {
  assert(
    physioDashboard.includes(requiredPhysioText),
    `Physiotherapy view is missing: ${requiredPhysioText}`,
  );
}

for (const requiredLabText of [
  "Lectura tecnica de Laboratorio",
  "Ordenes",
  "Pruebas",
  "Throughput",
  "Utilizacion",
  "TAT",
  "Rechazo",
  "Reproceso",
  "Ingreso/prueba",
  "Costo/prueba",
  "Margen",
]) {
  assert(
    laboratoryDashboard.includes(requiredLabText),
    `Laboratory view is missing: ${requiredLabText}`,
  );
}

for (const requiredImagingText of [
  "Lectura tecnica de Imagenes",
  "Estudios",
  "Modalidad",
  "Utilizacion equipo",
  "Tiempos",
  "Informes pendientes",
  "Downtime",
  "Productividad",
]) {
  assert(
    imagingDashboard.includes(requiredImagingText),
    `Imaging view is missing: ${requiredImagingText}`,
  );
}

for (const requiredDesignText of [
  "Macro Sprint 4 Executive System",
  "Spacing",
  "Typography",
  "Semantic States",
  "Charts",
  "Loading, Empty And Error",
]) {
  assert(
    designSystem.includes(requiredDesignText),
    `Design system is missing: ${requiredDesignText}`,
  );
}

for (const requiredChecklistText of [
  "Security",
  "Database",
  "Data",
  "Integrations",
  "Observability",
  "QA",
  "Deploy",
  "Manual Production Blockers",
]) {
  assert(
    checklist.includes(requiredChecklistText),
    `Production checklist is missing: ${requiredChecklistText}`,
  );
}

for (const requiredDemoText of [
  "maximo 10 minutos",
  "Executive Command Center",
  "detectar alerta",
  "comparar gerentes",
  "mostrar importacion",
  "calidad y lineage",
]) {
  assert(
    demoScript.includes(requiredDemoText),
    `Executive demo script is missing: ${requiredDemoText}`,
  );
}

for (const requiredDocText of [
  "Macro Sprint 4",
  "Production Ready",
  "verificacion DOM",
  "credenciales reales de conectores",
]) {
  assert(
    knownRisks.includes(requiredDocText) &&
      architecture.includes(requiredDocText) &&
      roadmap.includes(requiredDocText),
    `Sprint 4 docs are missing shared blocker text: ${requiredDocText}`,
  );
}

for (const forbiddenPattern of [
  /type=["']password["'][^>]*value=/i,
  /ANALIZA_DEMO_ADMIN_PASSWORD\s*=\s*["'][^"']+["']/,
]) {
  assert(
    !executiveDashboard.match(forbiddenPattern) &&
      !managerDashboard.match(forbiddenPattern) &&
      !importsDashboard.match(forbiddenPattern) &&
      !connectorsDashboard.match(forbiddenPattern),
    `Forbidden credential-like pattern found: ${forbiddenPattern}`,
  );
}

console.log("Macro Sprint 4 executive readiness checks passed.");
