import { readFileSync, statSync } from "node:fs";

const modelPath = "lib/analytics/dashboard-validation-agent.ts";
const componentPath = "components/dashboard-validation-agent.tsx";
const apiRoutePath = "app/api/analia-chat/route.ts";
const appLayoutPath = "app/layout.tsx";
const globalStylesPath = "app/globals.css";
const docsPath = "docs/analia-data-science-agent.md";
const envExamplePath = ".env.example";
const packagePath = "package.json";

for (const file of [
  modelPath,
  componentPath,
  apiRoutePath,
  appLayoutPath,
  globalStylesPath,
  docsPath,
  envExamplePath,
  packagePath,
]) {
  statSync(file);
}

const model = readFileSync(modelPath, "utf8");
const component = readFileSync(componentPath, "utf8");
const apiRoute = readFileSync(apiRoutePath, "utf8");
const appLayout = readFileSync(appLayoutPath, "utf8");
const globalStyles = readFileSync(globalStylesPath, "utf8");
const docs = readFileSync(docsPath, "utf8");
const envExample = readFileSync(envExamplePath, "utf8");
const packageJson = readFileSync(packagePath, "utf8");

for (const requiredModelText of [
  "DashboardValidationAudit",
  "DashboardAnalysisModel",
  "DashboardDensityStatus",
  "Lectura visual correcta",
  "Muy cargada",
  "Exploratorio",
  "Descriptivo",
  "Predictivo",
  "getDashboardAuditForPath",
  "getDashboardValidationSummary",
  "AnaliaScreenChatResponse",
  "createAnaliaScreenChatResponse",
  "comparacion",
  "sistema",
  "asksAboutAnaliaBehavior",
  "Por que AnaliA no respondio bien",
  "contestaba lo que no preguntaste",
  "detectChatIntent",
  "getScreenSignals",
  "compactChatBullets",
  "looksLikeNavigationDump",
  "getBusinessLineComparisonSummary",
  "getSingleLineComparisonSummary",
  "Si, pero la mejora es parcial",
  "dataStatus: \"DEMO\"",
  "/protected/overview",
  "/protected/operacion",
  "/protected/finanzas",
  "/protected/citas",
  "/protected/capacidad",
  "/protected/sucursales",
  "/protected/gerentes",
  "/protected/profesionales",
  "/protected/servicios",
  "/protected/fisioterapia",
  "/protected/laboratorio",
  "/protected/imagenes",
  "/protected/insights",
  "/protected/importaciones",
  "/protected/plantillas",
]) {
  if (!model.includes(requiredModelText)) {
    throw new Error(`Dashboard validation model is missing: ${requiredModelText}`);
  }
}

for (const requiredComponentText of [
  "DashboardValidationAgent",
  "Hablar con AnaliA",
  "Preguntar a AnaliA sobre esta pantalla",
  "Resumeme los insights mas importantes",
  "Hay algo critico?",
  "Lee esta pantalla",
  "Que hago primero?",
  "getReadableScreenText",
  "getFriendlyBullets",
  "rounded-br-sm",
  "rounded-bl-sm",
  "max-w-[82%]",
  "createAnaliaScreenChatResponse",
  "/api/analia-chat",
  "isThinking",
  "AnaliA esta leyendo esta pantalla",
  "closePanel",
  "Cerrar ventana de AnaliA",
  "Minimizar chat",
  "event.key !== \"Escape\"",
  "mode === \"ai\"",
  "Fuentes:",
  "data-analia-dashboard-mode",
  "data-analia-dashboard-density",
  "Chat con AnaliA",
  "Ajustes aplicados",
  "Validacion",
  "usePathname",
]) {
  if (!component.includes(requiredComponentText)) {
    throw new Error(`Dashboard validation component is missing: ${requiredComponentText}`);
  }
}

for (const requiredApiRouteText of [
  "OPENAI_API_KEY",
  "ANALIA_OPENAI_MODEL",
  "https://api.openai.com/v1/responses",
  "store: false",
  "Agente IA server-side",
  "sanitizeText",
  "createAnaliaScreenChatResponse",
  "extractOpenAIResponseText",
  "Devuelve SOLO JSON valido",
  "intent debe ser uno de: resumen, critico, lectura, accion, comparacion, sistema",
]) {
  if (!apiRoute.includes(requiredApiRouteText)) {
    throw new Error(`AnaliA API route is missing: ${requiredApiRouteText}`);
  }
}

if (!appLayout.includes("DashboardValidationAgent")) {
  throw new Error("Root layout must mount DashboardValidationAgent.");
}

for (const requiredStyleText of [
  '[data-analia-dashboard-mode="visual"]',
  '[data-analia-dashboard-density="Muy cargada"]',
  "scroll-padding-bottom",
]) {
  if (!globalStyles.includes(requiredStyleText)) {
    throw new Error(`Visual reading styles are missing: ${requiredStyleText}`);
  }
}

for (const requiredDocsText of [
  "Auditoria visual de dashboards",
  "cada pestana del BI",
  "Lectura visual correcta",
  "Cargada",
  "Muy cargada",
  "Burbuja de chat global",
  "lectura de la pantalla visible",
  "/api/analia-chat",
  "OPENAI_API_KEY",
  "burbujas breves",
  "filtra navegacion",
  "motor `DEMO` deterministico",
]) {
  if (!docs.includes(requiredDocsText)) {
    throw new Error(`AnaliA docs are missing: ${requiredDocsText}`);
  }
}

for (const requiredEnvText of [
  "OPENAI_API_KEY",
  "ANALIA_OPENAI_MODEL",
]) {
  if (!envExample.includes(requiredEnvText)) {
    throw new Error(`Env example is missing: ${requiredEnvText}`);
  }
}

if (!packageJson.includes("tests/dashboard-validation-agent.test.mjs")) {
  throw new Error("Test script must include dashboard validation checks.");
}

console.log("Dashboard validation agent checks passed.");
