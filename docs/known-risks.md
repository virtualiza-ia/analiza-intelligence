# Known Risks

Fecha de revision: 2026-08-07

Este registro resume riesgos vigentes segun la auditoria principal y la revision del codigo actual. No representa una lista de bugs corregidos; es una base para priorizar sprints.

## P0

| ID | Riesgo | Estado | Impacto | Evidencia |
| --- | --- | --- | --- | --- |
| P0-SEC-001 | RBAC server-side incompleto en rutas protegidas | Vigente | Usuarios podrian acceder por URL directa a modulos no permitidos | `app/protected/[module]/page.tsx`, `lib/navigation.ts` |
| P0-SEC-002 | Autorizacion sensible delegada a cliente | Vigente | Invitaciones o acciones privilegiadas podrian ejecutarse con actor/scope manipulados | `app/api/users/invite/route.ts`, `components/business-module-dashboard.tsx` |
| P0-SEC-003 | Selector `Rol DEMO` disponible en shell protegido | Vigente en modo demo | Riesgo de confundir demos con permisos reales o filtrar comportamiento a ambientes no demo | `components/app-sidebar.tsx` |
| P0-SEC-004 | Separacion demo/staging/production insuficiente | Vigente | Riesgo de mezclar datos DEMO con datos reales | `lib/tenant/demo-context.ts`, `supabase/seed.sql`, `lib/analytics/*` |
| P0-SEC-005 | Credenciales demo expuestas en DOM | No confirmado en fuente actual | Si reaparece en runtime, compromete acceso demo/admin | `components/login-form.tsx`, `lib/auth/demo-admin.ts` |
| P0-DATA-001 | DEMO y estructuras reales conviven en runtime | Vigente | Ejecutivos podrian leer datos demo como si fueran reales | `lib/analytics/*`, `lib/tenant/*` |

## P1

| ID | Riesgo | Estado | Impacto | Evidencia |
| --- | --- | --- | --- | --- |
| P1-BI-001 | Filtros globales no recalculan todos los KPIs | Vigente | Decisiones con metricas stale o fuera de alcance | `components/tenant-context-header.tsx`, `lib/analytics/demo-dashboard.ts` |
| P1-BI-002 | Contexto visible puede no coincidir con pagina de seleccion | Vigente | Usuario cree estar filtrando una entidad distinta | `components/context-selection-form.tsx` |
| P1-FIN-001 | Finanzas no reconcilian | Vigente | Venta total, canales, pagos y tendencias pueden contradecirse | `lib/analytics/financial-health.ts` |
| P1-IMP-001 | Importaciones reales sin pipeline server-side | Vigente | Archivos pueden simular publicacion sin validacion durable | `components/import-operations-dashboard.tsx` |
| P1-IMP-002 | Entradas manuales persisten localmente | Vigente | Riesgo de perdida de datos y falta de auditoria | `components/manual-monthly-entry-dashboard.tsx` |
| P1-DQ-001 | No hay data quality gate central | Vigente | Insights pueden mostrarse con datos incompletos | `lib/analytics/*` |
| P1-ORG-001 | Jerarquia no esta completamente conectada a DB/sesion/permisos | Vigente | Areas y sucursales pueden comportarse como demo UI, no como alcance real | `lib/tenant/managed-branch-records.ts`, `supabase/migrations/*` |

## P2

| ID | Riesgo | Estado | Impacto | Evidencia |
| --- | --- | --- | --- | --- |
| P2-UX-001 | Overflow responsive en dashboards densos | Vigente | Mobile/tablet puede ser dificil de usar | `components/*dashboard*.tsx` |
| P2-INT-001 | Conectores sin endpoints reales | Vigente | Integraciones no estan listas para operacion | `components/crm-connectors-dashboard.tsx`, `lib/analytics/business-control-center.ts` |
| P2-ROUTE-001 | `/protected/apis` no existe como modulo | Vigente | Enlaces o bookmarks pueden terminar en 404 | `lib/navigation.ts`, `app/protected/[module]/page.tsx` |
| P2-UX-002 | Error React minified #418 reportado por auditoria | No reproducido en revision estatica | Requiere reproduccion browser/runtime | Auditoria principal |
| P2-BI-001 | Terminos de capacidad aun necesitan contrato final | Parcial | Riesgo de interpretacion operativa incorrecta | `components/capacity-occupancy-dashboard.tsx`, `lib/analytics/capacity-occupancy.ts` |

## Riesgos transversales

- No debe desplegarse a produccion sin autorizacion explicita y evidencia de cierre P0.
- No deben modificarse migraciones ya ejecutadas; usar migraciones nuevas.
- No debe presentarse ningun KPI como concluyente sin source, periodo, formula, granularidad y required fields.
- No deben mezclarse datos DEMO y produccion en la misma organizacion, query, export, insight o vista ejecutiva.
- Todo permiso debe evaluarse server-side ademas de cualquier control visual.

## Decisiones pendientes

- Definir matriz oficial de roles y modulos para Gerente de Operaciones, Gerente de Area, Gerente de Sucursal y usuarios operativos.
- Definir estructura final de ambientes y flags para DEMO, staging y production.
- Definir contratos KPI financieros antes de corregir dashboards financieros.
- Definir si `/protected/apis` debe existir, redirigir o eliminarse.
- Definir conectores prioritarios y credenciales requeridas para Sprint 5.
