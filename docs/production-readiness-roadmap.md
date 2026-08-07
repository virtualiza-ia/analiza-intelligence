# Production Readiness Roadmap

Fecha de revision: 2026-08-07  
Fuente principal: `docs/audits/ANALIZA_INTELLIGENCE_AUDIT.md`  
Estado objetivo: mover ANALIZA INTELLIGENCE de CRITICAL a PRODUCTION READY. Sprint 1 fue autorizado despues del cierre de Sprint 0.

## Estado actual del repo

- Repositorio Next.js App Router con TypeScript estricto, Supabase SSR, PostgreSQL local opcional, Tailwind, Radix UI, Lucide, Nodemailer y OpenAI server-side.
- La auditoria principal esta presente en `docs/audits/ANALIZA_INTELLIGENCE_AUDIT.md`.
- `git status` antes de crear esta documentacion mostraba `docs/audits/` como contenido no trackeado.
- El producto contiene una mezcla importante de pantallas funcionales, datos DEMO tipados en TypeScript y migraciones Supabase para jerarquia, RLS y contexto semantico.
- Sprint 0 quedo cerrado con commit independiente.
- Sprint 1 implementa controles P0 de seguridad y RBAC sin iniciar Sprint 2.

## Stack detectado

- Frontend: Next.js, React 19, App Router, Tailwind CSS, Radix UI primitives, Lucide icons.
- Backend: Next.js route handlers, Supabase SSR/Auth, PostgreSQL via `pg`, cookies server-side.
- BI/demo data: modulos TypeScript bajo `lib/analytics` y `lib/tenant`.
- Validacion: ESLint 9, TypeScript 5, pruebas custom con Node.
- Integraciones: Nodemailer para invitaciones, OpenAI en `/api/analia-chat`; conectores CRM/ERP/documentos estan principalmente en estado de diseno/demo.

## Arquitectura detectada

- `app/protected/layout.tsx` valida acceso general a area protegida, pero no aplica permisos por ruta/modulo.
- `app/protected/[module]/page.tsx` renderiza modulos protegidos desde `lib/navigation.ts`; las restricciones `allowedRoles` viven en navegacion/UI y no se aplican server-side en el render dinamico.
- `proxy.ts` y `lib/supabase/proxy.ts` refrescan/verifican sesion y redirigen usuarios no autenticados, pero no hacen RBAC granular.
- `components/app-sidebar.tsx` filtra menu por rol en cliente y conserva selector `Rol DEMO` cuando `allowDemoRoleSwitch` esta activo.
- El contexto global se guarda en URL, `localStorage`, `sessionStorage` y eventos de navegador desde `components/tenant-context-header.tsx`.
- Los dashboards consumen datos demo/estaticos desde `lib/analytics`; no existe todavia un servicio semantico central que aplique pais, empresa, area, sucursal, periodo y rol a todos los KPIs.
- Las importaciones reales aun no tienen pipeline server-side completo; los flujos actuales simulan validacion/publicacion DEMO en cliente.
- Las migraciones Supabase incluyen RLS, jerarquia y contexto semantico, pero la aplicacion no depende de forma consistente de esas politicas para autorizacion de rutas/API.

## Hallazgos P0 despues de Sprint 1

- P0-SEC-001: RBAC server-side para rutas dinamicas queda resuelto en aplicacion con `requireProtectedPath` y politica central. Viewer ya no debe renderizar modulos administrativos por URL directa.
- P0-SEC-002: Selector `Rol DEMO` queda limitado por ambiente server-side y sincroniza rol contra `/api/auth/demo-role`; staging/production no lo habilitan.
- P0-SEC-003: Invitaciones ya no aceptan `actorRole` ni `actorScope` desde cliente. El actor se deriva server-side y se valida con `canPerformAction`.
- P0-SEC-004: Se agrega `lib/security/environment.ts` para separar demo/staging/production y bloquear demo auth/role switch fuera de demo.
- P0-DATA-001: Usuarios DEMO automaticos ya no se cargan en Usuarios y permisos fuera de runtime demo. Persisten datasets DEMO BI para sprints posteriores.
- P0-RLS-001: Se crea migracion nueva para endurecer RLS de area/sucursal y auditar cambios sensibles. Ejecucion remota pendiente.

## Hallazgos P0 no confirmados o parcialmente resueltos

- BUG-001 de la auditoria, credenciales demo visibles en DOM, no se confirma en el codigo fuente actual. `components/login-form.tsx` no incluye password hardcoded ni prellenado; `ANALIZA_DEMO_ADMIN_PASSWORD` se lee server-side. Persiste riesgo por usuario demo y token default si el ambiente esta mal configurado.
- Proteccion de sesion general existe para `/protected`, pero no equivale a autorizacion por alcance pais/empresa/area/sucursal.

## Hallazgos P1 vigentes

- Filtros globales: el contexto se propaga por URL/storage/eventos, pero los KPIs no recalculan de forma uniforme por sucursal y periodo.
- BI: no hay contrato central obligatorio para formulas, granularidad, required fields, lineage y condiciones de bloqueo.
- Finanzas: metricas financieras hardcoded no reconcilian. La venta total de laboratorio no cuadra con ventas por canal, formas de pago, tendencias anuales ni narrativas de crecimiento.
- Importaciones: existen tabs, seleccion de archivo y estados DEMO, pero la lectura, validacion, staging, publicacion y auditoria reales deben ocurrir server-side.
- Campos requeridos: hay validacion funcional en algunos formularios, pero falta consistencia en required/aria-required y contratos de datos.
- Jerarquia organizacional: hay modelos, migraciones y datos DEMO administrados, pero falta demostrar persistencia real y enforcement integral de operaciones por area/sucursal.
- Calidad de datos: falta compuerta que impida mostrar insights ejecutivos cuando campos esenciales o conciliaciones no pasan.

## Hallazgos P2 vigentes

- Responsive: varios dashboards usan tablas con anchos minimos grandes y pueden generar overflow en mobile.
- Integraciones: conectores CRM/ERP/documentos son principalmente UI/demo; no existen rutas API concretas para los endpoints esperados.
- Ruta `/protected/apis`: sigue sin modulo equivalente en `lib/navigation.ts` y debe resolverse como redireccion, alias o eliminacion de enlaces.
- Error React minified #418: no se confirma desde codigo estatico; requiere reproduccion visual/runtime.
- Capacidad: la separacion disponible/planeada/efectiva esta mejorada, pero aun quedan etiquetas como `Brecha meta` que pueden requerir precision semantica.

## Archivos criticos afectados por los hallazgos

- `app/protected/layout.tsx`
- `app/protected/[module]/page.tsx`
- `app/protected/overview/page.tsx`
- `proxy.ts`
- `lib/supabase/proxy.ts`
- `lib/navigation.ts`
- `components/app-sidebar.tsx`
- `components/tenant-context-header.tsx`
- `components/context-selection-form.tsx`
- `components/executive-dashboard.tsx`
- `components/financial-health-dashboard.tsx`
- `components/import-operations-dashboard.tsx`
- `components/manual-monthly-entry-dashboard.tsx`
- `components/business-module-dashboard.tsx`
- `components/crm-connectors-dashboard.tsx`
- `lib/auth/demo-admin.ts`
- `lib/auth/local-session.ts`
- `app/api/users/invite/route.ts`
- `lib/server/user-invitations.ts`
- `lib/analytics/demo-dashboard.ts`
- `lib/analytics/financial-health.ts`
- `lib/tenant/delegation-policy.ts`
- `lib/tenant/demo-context.ts`
- `lib/tenant/managed-branch-records.ts`
- `supabase/migrations/*`
- `supabase/seed.sql`

## Discrepancias entre auditoria y codigo actual

- Credenciales DEMO expuestas: no confirmado en fuente actual. El login ya no muestra password demo prellenado; revisar runtime y variables sigue siendo obligatorio.
- Tabs de importaciones: mejorado. Ahora existen tabs funcionales y seleccion de archivo; el riesgo vigente es que la validacion/publicacion real sigue sin servidor.
- Filtro de fecha: mejorado en UI/URL, pero no en calculo BI. Sigue vigente como integridad de KPI.
- Filtro de sucursal: sigue vigente para sucursales administradas porque los IDs de ramas gestionadas no empatan con templates de resultados usados por ciertos dashboards.
- Contexto: sigue vigente. La pagina de seleccion puede mostrar valores por defecto distintos al contexto en URL/header.
- Finanzas: vigente. Los montos no reconcilian.
- Capacidad: parcialmente resuelto. Hay mejor separacion semantica, pero quedan terminos que deben formalizarse.
- `/protected/imagenes`: existe como modulo de imagenes; la inconsistencia exacta de auditoria debe revalidarse en UI.
- `/protected/apis`: sigue siendo 404/ausente.
- Operational areas: existen derivadas en frontend y migraciones, pero falta confirmar poblacion real en DB y enforcement completo.

## Dependencias entre sprints

- Sprint 0 desbloquea todos los demas porque define ambientes, baseline, validacion y politica de datos DEMO.
- Sprint 1 debe ocurrir antes de exponer rutas, importaciones, invitaciones o conectores a usuarios reales.
- Sprint 2 depende de contratos KPI y de contexto global confiable; tambien alimenta finanzas y dashboards ejecutivos.
- Sprint 3 depende de reglas de calidad/lineage del Sprint 2 y produce datos confiables para BI.
- Sprint 4 depende de RBAC del Sprint 1 para que la jerarquia no sea solo UI.
- Sprint 5 depende de ambiente seguro, secretos server-only e importaciones auditables.
- Sprint 6 depende de contratos de datos estables para no redisenar UX sobre metricas inconsistentes.
- Sprint 7 depende de cierre P0/P1 y evidencia de lint, typecheck, tests y build.
- Sprint 8 solo debe ejecutarse con datos DEMO aislados o datos reales autorizados y validados.

## Roadmap

### Sprint 0 - Baseline y ambientes

Objetivo: congelar estado actual, documentar arquitectura, separar modos de ejecucion y establecer gates.

Alcance:
- Inventario de rutas, APIs, datos DEMO, variables de entorno y dependencias.
- Definir matriz de ambientes: local demo, staging, production.
- Crear checklist de validacion y politica de no despliegue sin autorizacion.
- Confirmar que no hay secretos en source, logs ni bundles.

Criterios de salida:
- Documentacion actualizada.
- `AGENTS.md` actualizado.
- `lint`, `typecheck`, `tests` y `build` definidos como obligatorios para cierre de sprint.
- Commit independiente de Sprint 0.

### Sprint 1 - Security y RBAC

Objetivo: implementar autorizacion server-side por rol y alcance.

Alcance:
- AuthorizationService server-side para identidad y permisos.
- Guards server-side para rutas protegidas y URL directa.
- Autorizacion en APIs sensibles, empezando por invitaciones y AnaliA.
- Aislamiento server-side de selector `Rol DEMO`.
- Actor de invitacion derivado de sesion server-side.
- Validacion de rol y alcance pais/empresa/area/sucursal para acciones P0.
- Migracion RLS nueva para endurecer area/sucursal y auditoria de cambios sensibles.

Criterios de salida:
- Viewer no puede entrar por URL directa a modulos no permitidos.
- Invitaciones no aceptan actor/scope desde cliente como fuente de verdad.
- Pruebas de RBAC por rol y alcance.
- `lint`, `typecheck`, `tests` y `build` deben pasar antes del commit.

### Sprint 2 - Integridad BI y filtros

Objetivo: hacer que filtros y KPIs sean consistentes, trazables y bloqueables si faltan datos.

Alcance:
- Servicio semantico de contexto y filtros.
- Contratos KPI por formula, granularidad, required fields y lineage.
- Recalculo real por pais, empresa, area, sucursal y periodo.
- Bloqueos visibles cuando no hay datos suficientes.

Criterios de salida:
- Overview, finanzas y dashboards principales reaccionan igual al contexto.
- No se muestran totales stale ante filtros incompatibles.

### Sprint 3 - Importaciones y calidad de datos

Objetivo: convertir importaciones de demo UI a pipeline confiable.

Alcance:
- Upload server-side para CSV/XLSX.
- Validacion de extension, tamano, columnas, tipos, formulas peligrosas y duplicados.
- Staging, preview, publish, rollback y audit log.
- Data quality scoring y lineage por archivo/import.

Criterios de salida:
- Ningun dato importado llega a BI sin validacion y trazabilidad.

### Sprint 4 - Jerarquia organizacional

Objetivo: operar la jerarquia real Gerente de Operaciones -> Area -> Sucursal -> Operativo.

Alcance:
- CRUD server-side para areas, sucursales y asignaciones.
- Politicas por pais/empresa/area/sucursal.
- Pruebas de creacion y administracion delegada.

Criterios de salida:
- Gerente de Area administra solo sus sucursales.
- Gerente de Sucursal administra solo su sucursal.

### Sprint 5 - Integraciones

Objetivo: habilitar conectores reales con seguridad, auditoria y modo DEMO separado.

Alcance:
- Runtime server-side para credenciales.
- APIs oficiales cuando existan.
- Conectores disabled por defecto sin credenciales.
- Demo adapters claramente marcados.

Criterios de salida:
- Ninguna credencial vive en cliente.
- Conectores fallan cerrado cuando falta configuracion o cambia estructura externa.

### Sprint 6 - Frontend, UX y responsive

Objetivo: estabilizar experiencia mobile/desktop y estados de producto.

Alcance:
- Revisar overflow, truncamiento, tablas, formularios y navegacion.
- Estados vacios, loading, error, no-data y no-permission.
- Revalidacion visual por rutas criticas.

Criterios de salida:
- Pantallas criticas sin overlap ni overflow incoherente.

### Sprint 7 - QA y Production Readiness

Objetivo: cerrar gates de lanzamiento.

Alcance:
- Pruebas E2E por rol y alcance.
- Regression suite BI, importaciones, finanzas y seguridad.
- Build production, smoke test, rollback plan y runbooks.

Criterios de salida:
- P0 cerrado, P1 aceptado o cerrado, P2 documentado.
- Evidencia de lint, typecheck, tests y build.

### Sprint 8 - Executive Demo

Objetivo: preparar demo ejecutiva sin comprometer seguridad ni datos reales.

Alcance:
- Dataset DEMO aislado.
- Narrativa ejecutiva con KPIs trazables.
- Flujos principales: filtros, finanzas, importaciones, jerarquia e insights.

Criterios de salida:
- Demo reproducible, marcada como DEMO y sin mezcla con produccion.
