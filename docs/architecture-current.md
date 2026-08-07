# Arquitectura Actual

Fecha de revision: 2026-08-07

## Resumen

ANALIZA INTELLIGENCE es una aplicacion BI multipais y multiempresa construida sobre Next.js App Router. El producto ya contiene pantallas ejecutivas, dashboards operativos, modelos de jerarquia, migraciones Supabase y datos DEMO extensos. Despues de Sprint 1, autenticacion, autorizacion de rutas, permisos de invitacion y aislamiento demo/production tienen una capa server-side central. Filtros, KPI contracts, importaciones y conectores siguen para sprints posteriores.

## Stack

- Next.js App Router con React 19.
- TypeScript estricto.
- Tailwind CSS, Radix UI, Lucide React.
- Supabase SSR/Auth con `@supabase/ssr` y `@supabase/supabase-js`.
- PostgreSQL opcional via `pg`.
- Nodemailer para invitaciones.
- OpenAI API server-side en el endpoint de AnaliA.
- Pruebas custom con Node y scripts `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Capas detectadas

### Rutas y shell protegido

- `app/protected/layout.tsx` actua como compuerta de acceso general via `requireProtectedAccess`.
- `app/protected/overview/page.tsx` renderiza el dashboard ejecutivo despues de `requireProtectedPath`.
- `app/protected/[module]/page.tsx` resuelve modulos dinamicos desde `lib/navigation.ts` y aplica `requireProtectedPath` antes de renderizar.
- `components/app-sidebar.tsx` controla navegacion visible por rol en cliente.
- `app/forbidden/page.tsx` presenta denegacion profesional cuando el servidor bloquea una ruta.

Estado Sprint 1: el modulo dinamico ya no depende solo del sidebar. `lib/security/authorization-policy.ts` aplica `allowedRoles` server-side y superadministradores tienen override controlado.

### Autenticacion

- `proxy.ts` llama `updateSession` para refrescar/verificar sesion.
- `lib/supabase/proxy.ts` maneja redireccion de usuarios no autenticados.
- `lib/auth/demo-admin.ts` habilita acceso demo admin solo cuando `lib/security/environment.ts` permite runtime demo.
- `lib/auth/local-session.ts` firma sesiones locales con HMAC y cookies httpOnly.
- `components/login-form.tsx` intenta demo admin, login local y Supabase.
- `lib/server/authorization.ts` resuelve el actor actual desde sesion local, sesion demo o claims Supabase.

Estado Sprint 1: las rutas protegidas y APIs sensibles derivan actor server-side. Sesiones locales requieren secreto configurado fuera de demo.

### RBAC y permisos

- `lib/navigation.ts` define roles permitidos por modulo.
- `lib/tenant/delegation-policy.ts` define reglas de delegacion para operaciones, area, sucursal y usuarios operativos.
- Migraciones Supabase agregan tablas, funciones y politicas RLS.
- `app/api/users/invite/route.ts` valida invitaciones con actor server-side y ya no acepta `actorRole` ni `actorScope` como fuente de verdad.
- `app/api/analia-chat/route.ts` exige sesion y permiso para la ruta consultada.

Estado Sprint 1: existe una politica pura en `lib/security/authorization-policy.ts` y una capa server-side en `lib/server/authorization.ts`.

### Contexto global

- `components/tenant-context-header.tsx` sincroniza contexto por URL, storage y eventos.
- `components/context-selection-form.tsx` permite elegir pais, empresa, linea y sucursal.
- `lib/tenant/demo-context.ts` define opciones DEMO y deriva areas/sucursales.

Riesgo principal: cada dashboard decide como usar el contexto. No existe un motor unico que aplique pais, empresa, area, sucursal, periodo y rol a cada consulta.

### Dashboards y BI

- `components/executive-dashboard.tsx` usa datos de `lib/analytics/demo-dashboard.ts`.
- `components/financial-health-dashboard.tsx` usa `lib/analytics/financial-health.ts`.
- Otros dashboards consumen modulos en `lib/analytics`.

Riesgo principal: la capa BI es mayormente TypeScript/demo data, no una capa semantica con contratos de KPI, lineage y controles de calidad.

### Finanzas

- Los valores financieros se calculan y formatean en `lib/analytics/financial-health.ts`.
- Existen montos hardcoded por canal, forma de pago, tendencia e insight.

Riesgo principal: las cifras no reconcilian entre total, canales, pagos y periodos. Finanzas necesita contratos antes de presentarse como dato ejecutivo.

### Importaciones

- `components/import-operations-dashboard.tsx` muestra carga masiva, validacion y publicacion DEMO.
- `components/manual-monthly-entry-dashboard.tsx` captura entradas mensuales y guarda historial local.
- No se detecto pipeline server-side completo de importacion para CSV/XLSX.

Riesgo principal: la UI ya simula el flujo, pero produccion necesita validacion server-side, staging, publish, rollback, audit log y lineage.

### Jerarquia organizacional

- `lib/tenant/managed-branch-records.ts` contiene sucursales, areas y managers DEMO.
- `lib/tenant/demo-context.ts` deriva areas operativas desde esos registros.
- Migraciones Supabase contienen estructura para jerarquia y RLS.

Riesgo principal: el modelo existe, pero falta cerrar el ciclo real entre DB, sesion, permisos y UI.

### Conectores e integraciones

- `components/crm-connectors-dashboard.tsx` presenta UI de conectores y credenciales DEMO.
- `lib/analytics/business-control-center.ts` lista endpoints esperados.
- No se detectaron rutas API reales bajo `/api/connectors`.

Riesgo principal: conectores estan en etapa demo/diseno. Las credenciales reales deben ser server-only y los conectores deben fallar cerrado.

## Arquitectura objetivo recomendada

- `AuthorizationService` server-side para rutas, APIs, acciones, importaciones, exportaciones y conectores. La base inicial ya existe para rutas, invitaciones y AnaliA.
- `TenantScope` obligatorio en cada request: organization, country, company, operational area, branch, role y assignments.
- `KpiSemanticService` con contratos versionados, required fields, formulas, filtros soportados y lineage.
- `ImportPipeline` server-side con staging, validation, publish, rollback, audit log y data quality score.
- `ConnectorRuntime` server-only con adapters reales y DEMO separados.
- `EnvironmentGuard` que impida mezclar DEMO/staging/production y bloquee datos demo en produccion.

## Cambios Sprint 1

- Capa de ambiente server-side en `lib/security/environment.ts`.
- Politica pura RBAC en `lib/security/authorization-policy.ts`.
- Resolucion server-side de actor en `lib/server/authorization.ts`.
- Guard de URL directa en `app/protected/[module]/page.tsx`, `app/protected/overview/page.tsx`, `app/protected/context/page.tsx` y `app/protected/page.tsx`.
- Pantalla `/forbidden`.
- Endpoint `/api/auth/demo-role` para sincronizar rol DEMO server-side solo en runtime demo.
- Invitaciones protegidas por actor server-side y auditoria con `actor_user_id` cuando existe UUID.
- Migracion `supabase/migrations/20260807000100_sprint1_harden_security_rbac.sql` para RLS estricto por area/sucursal y auditoria de cambios de rol/alcance/estado.

## Archivos clave

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
- `lib/analytics/*`
- `lib/tenant/*`
- `supabase/migrations/*`
- `supabase/seed.sql`
