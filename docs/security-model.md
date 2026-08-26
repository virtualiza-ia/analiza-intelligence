# Security Model

## Authentication And Invitations

Supabase Auth can be used as an authentication provider, but self-hosted deployments may authenticate invited users directly against PostgreSQL. The app supports login, invitation activation, logout, secure sessions, and protected routes. Public self-registration must be disabled from the product flow.

Local DEMO administrator access is available for local exploration before real users are provisioned. It uses HTTP-only cookies, is labeled DEMO, is gated by `APP_ENV=demo`/runtime checks, is disabled in Vercel production and preview/staging, and can be disabled locally with `ANALIZA_DISABLE_DEMO_ADMIN=true`. It is not enabled by default: local demo access requires `ANALIZA_ENABLE_DEMO_ADMIN=true` and a server-only `ANALIZA_DEMO_ADMIN_SESSION_TOKEN` of at least 32 characters.

The local executive demo login is created server-side through `/api/auth/demo-session`. The browser selects only an approved profile label; the server validates the role, writes the demo session cookies, and `AuthorizationService` resolves the actor and scope. No demo password is rendered in HTML, DOM, source code, or `NEXT_PUBLIC` variables.

When `NODE_ENV=production` and no explicit `APP_ENV`/`ANALIZA_APP_ENV` is present, the runtime fails closed as `production`; it must not silently become `demo`.

Self-hosted deployments may keep operational data, invitations, users, password hashes, and role assignments in PostgreSQL while email delivery uses an SMTP provider such as Google Workspace. User invitations are stored in `user_invitations` with a hashed token; the raw invitation token is sent only in the email link and must not be logged or stored in public data. When the user accepts the invitation, they create a password, the system stores only a server-side password hash in `auth.users.encrypted_password`, activates `profiles` and `user_roles`, clears the invitation token hash, and issues an HTTP-only local session cookie. SMTP credentials and local session secrets are server-only environment variables and are never exposed with `NEXT_PUBLIC_`.

## Roles

Official Analiza roles:

- `super_admin`: superadministrador. Administra la plataforma completa, permisos globales, gobierno de datos, conectores y seguridad.
- `webmaster_admin`: alias historico de administrador, conservado por compatibilidad con sesiones y datos DEMO existentes.
- `ceo`: reads the executive BI view for Analiza and all assigned business lines, countries, and branches; may invite lower roles inside its delegated scope.
- `gerente_operaciones`: creates operational areas, creates branches, assigns branches to areas, assigns area managers, captures branch capacity, imports operational data, and monitors all branches in scope through the unified operational report.
- `gerente_area`: creates or assigns branch managers only within assigned operational areas, supervises a branch group, validates monthly discipline, and compares branch manager performance.
- `gerente_sucursal`: registers the assigned branch monthly close through the controlled form and reads branch results, goals, progress, insights and evidence from `/protected/mi-sucursal` instead of separate goal, insight or bonus modules.
- `usuario_operativo`: loads or corrects operational data without managerial privileges when delegated.
- `viewer`: reads only authorized dashboards and records.

Role hierarchy is explicit in `role_hierarchy`:

- `super_admin`: 100
- `gerente_operaciones`: 80
- `gerente_area`: 60
- `gerente_sucursal`: 40
- `usuario_operativo`: 20
- `viewer`: 10

`webmaster_admin` is treated as a level 100 legacy alias. A user may only invite or assign roles with a lower hierarchy level, and only when the target scope is inside the user's delegated scope.

## Authorization

RLS must enforce access by:

- organization
- country
- company
- operational area
- branch
- role
- direct assignments

Users only see assigned countries, companies, branches, and allowed consolidated views.

Phase 1 adds RLS helper functions:

- `current_user_is_super_admin`
- `current_user_has_role`
- `current_user_can_access_org`
- `current_user_can_access_country`
- `current_user_can_access_company`
- `current_user_can_access_branch`

These functions are used by policies on the initial tenant, catalog, assignment, data source, and audit tables.

`current_user_is_super_admin` is retained as a compatibility helper name and maps to `super_admin` plus the legacy `webmaster_admin` alias.

The delegation migration adds these controls:

- `operational_areas`
- `area_branch_assignments`
- `manager_assignments`
- `reporting_lines`
- `user_invitations`
- `role_hierarchy`
- `permission_delegations`
- `assignment_history`
- `current_user_can_delegate_role`
- `current_user_can_access_operational_area`
- `current_user_can_manage_delegated_scope`

User creation is invitation-only. The platform must not ask administrators to set a manual password for another user. An invited account stays pending until accepted.

Users and managers are deactivated with soft delete fields and history, not physical deletion. If a manager owns branches or subordinates, the system must request reassignment before finalizing the deactivation.

Phase 3 extends RLS to appointments, capacity, professionals, anonymous patients, and service events. Operational reads are scoped through `current_user_can_access_branch`.

Write access to operational data is limited to `webmaster_admin`, `gerente_operaciones`, `gerente_area`, and the controlled import/form path for `gerente_sucursal`. Published closes require authorization before replacement. Connector management and connector execution are reserved for `super_admin` and `webmaster_admin`; `gerente_operaciones` uses Importaciones instead of Conectores or Integraciones.

Self-hosted PostgreSQL persistence also applies server-side authorization before reads and writes. Production database access requires an explicit `ANALIZA_POSTGRES_RLS_VERIFIED=true` gate after confirming that the configured database role does not bypass RLS and that deny cases fail in the target environment. This is a production readiness blocker, not a client-side control.

## Secret Handling

- Service role keys are server-only.
- Connector credentials stay server-side.
- Logs and audit entries must not contain secrets.
- Credential metadata may describe configured credentials without storing secret values in public tables.

## Patient Privacy

- Do not use real patient data in development.
- Do not show individual clinical results on executive dashboards.
- Use anonymous patient IDs for analytics.
- Avoid PII in imports, exports, logs, and demo data.

## File Safety

- Validate files on the server.
- Restrict extension and size.
- Sanitize file names.
- Preserve original uploads for traceability where appropriate.
- Block dangerous spreadsheet formulas in generated CSV/XLSX exports.
