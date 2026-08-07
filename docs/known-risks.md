# Known Risks

Fecha de revision: 2026-08-07

Este registro resume riesgos vigentes segun la auditoria principal y la revision del codigo actual. No representa una lista de bugs corregidos; es una base para priorizar sprints.

## P0

| ID | Riesgo | Estado | Impacto | Evidencia |
| --- | --- | --- | --- | --- |
| P0-SEC-001 | RBAC server-side incompleto en rutas protegidas | Resuelto en aplicacion | Usuarios podrian acceder por URL directa a modulos no permitidos | `lib/server/authorization.ts`, `lib/security/authorization-policy.ts`, `app/protected/[module]/page.tsx`, `app/forbidden/page.tsx` |
| P0-SEC-002 | Autorizacion sensible delegada a cliente | Resuelto para invitaciones | Invitaciones o acciones privilegiadas podrian ejecutarse con actor/scope manipulados | `app/api/users/invite/route.ts`, `lib/server/user-invitations.ts` |
| P0-SEC-003 | Selector `Rol DEMO` disponible en shell protegido | Mitigado | Riesgo de confundir demos con permisos reales o filtrar comportamiento a ambientes no demo | `lib/security/environment.ts`, `app/api/auth/demo-role/route.ts`, `components/app-sidebar.tsx` |
| P0-SEC-004 | Separacion demo/staging/production insuficiente | Mitigado parcialmente | Riesgo de mezclar datos DEMO con datos reales | `lib/security/environment.ts`, `lib/auth/demo-admin.ts`, `components/business-module-dashboard.tsx` |
| P0-SEC-005 | Credenciales demo expuestas en DOM | No confirmado; mitigado por busqueda y gating | Si reaparece en runtime, compromete acceso demo/admin | `components/login-form.tsx`, `lib/auth/demo-admin.ts` |
| P0-DATA-001 | DEMO y estructuras reales conviven en runtime | Parcial | Ejecutivos podrian leer datos demo como si fueran reales | `lib/analytics/*`, `lib/tenant/*` |

Nota Sprint 1: la migracion `supabase/migrations/20260807000100_sprint1_harden_security_rbac.sql` endurece RLS para area/sucursal y agrega auditoria de cambios de rol, alcance y estado. La ejecucion remota queda pendiente hasta autorizacion segura sobre Supabase.

## P1

| ID | Riesgo | Estado | Impacto | Evidencia |
| --- | --- | --- | --- | --- |
| P1-BI-001 | Filtros globales no recalculan todos los KPIs | Mitigado en dashboards ejecutivos principales | Decisiones con metricas stale o fuera de alcance si una pantalla queda fuera del contrato | `lib/analytics/global-filters.ts`, `lib/analytics/semantic-bi.ts`, `components/executive-dashboard.tsx`, `components/financial-health-dashboard.tsx`, `components/capacity-occupancy-dashboard.tsx` |
| P1-BI-002 | Contexto visible puede no coincidir con pagina de seleccion | Mitigado | Usuario cree estar filtrando una entidad distinta | `components/context-selection-form.tsx`, `components/tenant-context-header.tsx`, `lib/analytics/global-filters.ts` |
| P1-FIN-001 | Finanzas no reconcilian | Mitigado en capa DEMO Sprint 2 | Venta total, canales, pagos y tendencias pueden contradecirse si fuentes reales no pasan por invariantes | `lib/analytics/semantic-bi.ts`, `lib/analytics/financial-health.ts`, `tests/macro-sprint2-bi-integrity.test.mjs` |
| P1-IMP-001 | Importaciones reales sin pipeline server-side | Vigente | Archivos pueden simular publicacion sin validacion durable | `components/import-operations-dashboard.tsx` |
| P1-IMP-002 | Entradas manuales persisten localmente | Vigente | Riesgo de perdida de datos y falta de auditoria | `components/manual-monthly-entry-dashboard.tsx` |
| P1-DQ-001 | No hay data quality gate central | Mitigado para insights DEMO; vigente para pipeline real | Insights pueden mostrarse con datos incompletos si fuentes reales no calculan quality score | `lib/analytics/semantic-bi.ts`, `lib/analytics/insights.ts`, `components/data-quality-analia-dashboard.tsx` |
| P1-ORG-001 | Jerarquia no esta completamente conectada a DB/sesion/permisos | Vigente | Areas y sucursales pueden comportarse como demo UI, no como alcance real | `lib/tenant/managed-branch-records.ts`, `supabase/migrations/*` |

## P2

| ID | Riesgo | Estado | Impacto | Evidencia |
| --- | --- | --- | --- | --- |
| P2-UX-001 | Overflow responsive en dashboards densos | Vigente | Mobile/tablet puede ser dificil de usar | `components/*dashboard*.tsx` |
| P2-INT-001 | Conectores sin endpoints reales | Vigente | Integraciones no estan listas para operacion | `components/crm-connectors-dashboard.tsx`, `lib/analytics/business-control-center.ts` |
| P2-ROUTE-001 | `/protected/apis` no existe como modulo | Vigente | Enlaces o bookmarks pueden terminar en 404 | `lib/navigation.ts`, `app/protected/[module]/page.tsx` |
| P2-UX-002 | Error React minified #418 reportado por auditoria | No reproducido en revision estatica | Requiere reproduccion browser/runtime | Auditoria principal |
| P2-BI-001 | Terminos de capacidad aun necesitan contrato final | Mitigado parcialmente | Riesgo de interpretacion operativa incorrecta al conectar fuentes reales | `components/capacity-occupancy-dashboard.tsx`, `lib/analytics/capacity-occupancy.ts`, `lib/analytics/semantic-bi.ts` |

## Riesgos transversales

- No debe desplegarse a produccion sin autorizacion explicita y evidencia de cierre P0.
- No deben modificarse migraciones ya ejecutadas; usar migraciones nuevas.
- No debe presentarse ningun KPI como concluyente sin source, periodo, formula, granularidad y required fields.
- No deben mezclarse datos DEMO y produccion en la misma organizacion, query, export, insight o vista ejecutiva.
- Todo permiso debe evaluarse server-side ademas de cualquier control visual.

## Nota Macro Sprint 2

- Quedan fuera de alcance, por instruccion explicita, carga XLSX/CSV completa, CRM, facturacion API, webscraping, responsive profundo, rediseno visual premium y deployment.
- La reconciliacion financiera, filtros globales y calidad de datos estan mitigados sobre datasets DEMO versionados. El riesgo vuelve a abrirse si Sprint 3 no obliga importaciones server-side, staging, publish, rollback, audit log y lineage.
- Las conclusiones ejecutivas ahora deben bloquearse con `Datos insuficientes para conclusion ejecutiva` cuando confianza, completitud o conciliacion no alcanzan umbral.

## Decisiones pendientes

- Definir matriz oficial de roles y modulos para Gerente de Operaciones, Gerente de Area, Gerente de Sucursal y usuarios operativos.
- Definir estructura final de ambientes y flags para DEMO, staging y production.
- Convertir contratos KPI DEMO de Sprint 2 en contratos server-side versionados con fuente/import/conector trazable.
- Definir si `/protected/apis` debe existir, redirigir o eliminarse.
- Definir conectores prioritarios y credenciales requeridas para Sprint 5.
