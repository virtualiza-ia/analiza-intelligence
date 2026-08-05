# Analiza Intelligence - PostgreSQL handoff

Este paquete contiene la estructura actual de la base de datos para recrearla en PostgreSQL y compartirla con otro programador.

## Archivos

- `00_vanilla_postgres_compat.sql`: compatibilidad para PostgreSQL normal. Crea `auth.users`, `auth.uid()`, `anon` y `authenticated`.
- `01_schema_supabase_compatible.sql`: estructura principal tomada de las migraciones existentes.
- `02_seed_demo_optional.sql`: datos DEMO opcionales. No contiene datos reales de pacientes.
- `analiza_intelligence_full_vanilla_postgres.sql`: archivo completo para PostgreSQL normal, uniendo compatibilidad + estructura.
- `SCHEMA_TABLES.md`: mapa rapido de tablas, vistas, funciones y seguridad.

## Como recrearla en PostgreSQL normal

Desde la raiz del proyecto:

```bash
createdb analiza_intelligence
psql -d analiza_intelligence -f database/postgresql/analiza_intelligence_full_vanilla_postgres.sql
```

Si tambien quieren datos DEMO para probar pantallas:

```bash
psql -d analiza_intelligence -f database/postgresql/02_seed_demo_optional.sql
```

## Como recrearla en Supabase

Supabase ya incluye `auth.users`, `auth.uid()` y los roles internos. En ese caso usar solo:

```bash
psql "$DATABASE_URL" -f database/postgresql/01_schema_supabase_compatible.sql
```

Seed DEMO opcional:

```bash
psql "$DATABASE_URL" -f database/postgresql/02_seed_demo_optional.sql
```

## Notas importantes

- Este paquete es estructura de base de datos, no incluye secretos ni variables de entorno.
- El sistema actual esta conectado a Supabase Auth y Supabase API. Si se migra a PostgreSQL puro, el programador debe crear/adaptar el backend de autenticacion y conexion.
- La seguridad esta definida con RLS, politicas y funciones que revisan alcance por `organization_id`, `country_id`, `company_id`, `operational_area_id`, `branch_id` y `role_id`.
- El seed es solo DEMO. No mezclarlo con organizaciones reales.
- Las tablas mencionadas solo en documentos de vision futura, pero no presentes en migraciones, no fueron inventadas aqui.

## Orden fuente de migraciones

El schema consolidado sale de estos archivos, en este orden:

1. `supabase/migrations/20260720000100_phase1_core.sql`
2. `supabase/migrations/20260720000200_phase3_operations.sql`
3. `supabase/migrations/20260721000100_semantic_ecosystem.sql`
4. `supabase/migrations/20260729000100_area_manager_role.sql`
5. `supabase/migrations/20260729000200_delegated_user_hierarchy.sql`

## Variables que NO van dentro de la base

Estas se configuran en el servidor/Vercel/Supabase, no en SQL:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `OPENAI_API_KEY`
- `ANALIA_OPENAI_MODEL`
- `ANALIZA_DISABLE_DEMO_ADMIN`

