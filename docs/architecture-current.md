# Arquitectura Actual

Fecha de revision: 2026-08-07

## Resumen

ANALIZA INTELLIGENCE es una aplicacion BI multipais y multiempresa construida sobre Next.js App Router. El producto ya contiene pantallas ejecutivas, dashboards operativos, modelos de jerarquia, migraciones Supabase y datos DEMO extensos. La arquitectura actual permite navegar y simular flujos clave, pero todavia no garantiza production readiness porque autorizacion, filtros, KPI contracts, importaciones y conectores no estan centralizados ni aplicados de forma uniforme server-side.

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

- `app/protected/layout.tsx` actua como compuerta de acceso general.
- `app/protected/overview/page.tsx` renderiza el dashboard ejecutivo.
- `app/protected/[module]/page.tsx` resuelve modulos dinamicos desde `lib/navigation.ts`.
- `components/app-sidebar.tsx` controla navegacion visible por rol en cliente.

Riesgo principal: el layout valida sesion, pero el modulo dinamico no aplica `allowedRoles` server-side antes de renderizar.

### Autenticacion

- `proxy.ts` llama `updateSession` para refrescar/verificar sesion.
- `lib/supabase/proxy.ts` maneja redireccion de usuarios no autenticados.
- `lib/auth/demo-admin.ts` habilita acceso demo admin con cookie server-side y password desde variable de entorno.
- `lib/auth/local-session.ts` firma sesiones locales con HMAC y cookies httpOnly.
- `components/login-form.tsx` intenta demo admin, login local y Supabase.

Riesgo principal: autenticacion y autorizacion estan separadas de forma incompleta. Hay compuertas de sesion, pero permisos por ruta/API deben derivarse de servidor y alcance real.

### RBAC y permisos

- `lib/navigation.ts` define roles permitidos por modulo.
- `lib/tenant/delegation-policy.ts` define reglas de delegacion para operaciones, area, sucursal y usuarios operativos.
- Migraciones Supabase agregan tablas, funciones y politicas RLS.
- `app/api/users/invite/route.ts` valida invitaciones con `actorRole` y `actorScope` recibidos del cliente.

Riesgo principal: existen modelos y politicas, pero la aplicacion aun confia demasiado en UI/cliente para flujos sensibles.

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

- `AuthorizationService` server-side para rutas, APIs, acciones, importaciones, exportaciones y conectores.
- `TenantScope` obligatorio en cada request: organization, country, company, operational area, branch, role y assignments.
- `KpiSemanticService` con contratos versionados, required fields, formulas, filtros soportados y lineage.
- `ImportPipeline` server-side con staging, validation, publish, rollback, audit log y data quality score.
- `ConnectorRuntime` server-only con adapters reales y DEMO separados.
- `EnvironmentGuard` que impida mezclar DEMO/staging/production y bloquee datos demo en produccion.

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
