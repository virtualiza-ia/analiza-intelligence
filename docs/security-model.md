# Security Model

## Authentication

Authentication is local and server-side on PostgreSQL. Password hashes live in
`app_auth.accounts`; opaque session-token hashes live in `app_auth.sessions`.
Raw session tokens exist only in `HttpOnly`, `SameSite=Strict`, `Secure`
cookies in production. Sessions expire after eight hours and logout revokes
the corresponding database record.

Five failed password attempts lock the account for fifteen minutes. Public
self-registration is disabled. Automated password recovery remains disabled
until a server-side email provider and single-use reset-token flow are
configured; the UI fails closed and directs users to the superadministrator.

## Roles

Official Analiza roles:

- `super_admin`: superadministrador. Administra la plataforma completa, permisos globales, gobierno de datos, conectores y seguridad.
- `webmaster_admin`: alias historico de administrador, conservado por compatibilidad con sesiones y datos DEMO existentes.
- `ceo`: reads the executive BI view for Analiza and all assigned business lines, countries, and branches.
- `gerente_operaciones`: creates operational areas, creates branches, assigns branches to areas, assigns area managers, and monitors all branches in scope.
- `gerente_area`: creates or assigns branch managers only within assigned operational areas, supervises a branch group, validates monthly discipline, and compares branch manager performance.
- `gerente_sucursal`: registers the assigned branch monthly close through the controlled form and reads branch results.
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

The protected shell resolves the active role from `public.user_roles`. The
sidebar does not accept role selection from `localStorage`, and every module
route performs a server-side RBAC check. `super_admin` and the legacy
`webmaster_admin` alias can access every module; other roles only access the
modules explicitly assigned in `lib/navigation.ts`.

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

Write access to operational data is limited to `webmaster_admin`, `gerente_operaciones`, `gerente_area`, and the controlled monthly form path for `gerente_sucursal`. Published closes require authorization before replacement.

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
