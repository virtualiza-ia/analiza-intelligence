# Analiza Intelligence - schema map

Generado desde las migraciones actuales del proyecto. No incluye tablas futuras que solo existen como idea/documentacion.

## Core multiempresa

- `organizations`
- `currencies`
- `countries`
- `companies`
- `branches`
- `roles`
- `permissions`
- `role_permissions`
- `profiles`
- `user_roles`
- `user_country_access`
- `user_company_access`
- `user_branch_access`
- `branch_managers`
- `service_categories`
- `services`
- `data_sources`
- `audit_logs`

## Operacion, citas, capacidad y servicios

- `appointment_status_catalog`
- `professionals`
- `professional_schedules`
- `anonymous_patients`
- `appointments`
- `appointment_status_history`
- `capacity_records`
- `service_events`

## Modelo BI y analitica

- `business_lines`
- `managers`
- `channels`
- `payers`
- `date_dimension`
- `kpi_definitions`
- `import_jobs`
- `data_quality_issues`
- `insights`
- `goals`
- `fact_financial`
- `fact_goals`
- `fact_data_quality`
- `fact_customer_experience`

## Laboratorio

- `fact_lab_orders`
- `fact_lab_order_tests`
- `fact_lab_samples`
- `fact_lab_results`
- `fact_lab_inventory`
- `fact_lab_referrals`
- `fact_medical_visits`

## Fisioterapia

- `fact_physio_appointments`
- `fact_physio_sessions`
- `fact_physio_treatment_plans`
- `fact_physio_outcomes`

## Imagenes

- `fact_imaging_appointments`
- `fact_imaging_studies`
- `fact_imaging_reports`
- `fact_equipment_usage`
- `fact_equipment_maintenance`

## Jerarquia y delegacion

- `operational_areas`
- `area_branch_assignments`
- `manager_assignments`
- `reporting_lines`
- `user_invitations`
- `role_hierarchy`
- `permission_delegations`
- `assignment_history`

## Vistas

- `v_branch_capacity_summary`

## Funciones principales

- `set_updated_at()`
- `safe_ratio(numerator, denominator)`
- `current_user_is_super_admin()`
- `current_user_has_role(role_keys)`
- `current_user_can_access_org(target_organization_id)`
- `current_user_can_access_country(target_country_id)`
- `current_user_can_access_company(target_company_id)`
- `current_user_can_access_branch(target_branch_id)`
- `current_user_can_access_semantic_context(target_company_id, target_branch_id)`
- `current_user_max_role_level()`
- `current_user_can_delegate_role(target_role_id)`
- `current_user_can_access_operational_area(target_operational_area_id)`
- `current_user_can_manage_delegated_scope(target_country_id, target_company_id, target_operational_area_id, target_branch_id)`
- `audit_delegation_change()`

## Seguridad

La estructura activa RLS en las tablas principales. Las politicas revisan:

- rol del usuario
- organizacion
- pais
- empresa
- linea/area operativa
- sucursal
- permisos delegados

En PostgreSQL normal, `auth.uid()` depende de `request.jwt.claim.sub`. En Supabase esto ya lo maneja la plataforma.

