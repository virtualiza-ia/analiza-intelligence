import assert from "node:assert/strict";
import { Pool } from "pg";

import { assertSafePostgresRuntimeRole } from "../lib/server/database.ts";

function quotePostgresIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function poolFor(connectionString) {
  return new Pool({
    connectionString,
    max: 1,
    ssl:
      process.env.POSTGRES_SSL === "true" ||
      process.env.DATABASE_SSL === "true" ||
      connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
  });
}

if (!process.env.DATABASE_URL && process.env.APP_ENV === "demo") {
  console.log("Skipping PostgreSQL RLS runtime test in explicit demo environment.");
  process.exit(0);
}

assert.ok(
  process.env.DATABASE_URL,
  "DATABASE_URL is required to prove PostgreSQL RLS for staging/production release.",
);
assert.ok(
  process.env.DATABASE_ADMIN_URL,
  "DATABASE_ADMIN_URL is required to seed the isolated PostgreSQL RLS gate fixture.",
);

const ids = {
  areaA: "10000000-0000-4000-8000-0000000000a1",
  areaB: "10000000-0000-4000-8000-0000000000b1",
  branchA1: "10000000-0000-4000-8000-000000000101",
  branchA2: "10000000-0000-4000-8000-000000000102",
  branchB1: "10000000-0000-4000-8000-000000000201",
  ceo: "10000000-0000-4000-8000-00000000ce00",
  closingA1: "10000000-0000-4000-8000-00000000c101",
  closingA2: "10000000-0000-4000-8000-00000000c102",
  closingB1: "10000000-0000-4000-8000-00000000c201",
  companyA: "10000000-0000-4000-8000-0000000000c1",
  countryA: "10000000-0000-4000-8000-0000000000aa",
  currency: "10000000-0000-4000-8000-000000000001",
  gerenteAreaA: "10000000-0000-4000-8000-0000000000a2",
  gerenteSucursalA1: "10000000-0000-4000-8000-0000000000a3",
  insightA1: "10000000-0000-4000-8000-00000000d101",
  insightA2: "10000000-0000-4000-8000-00000000d102",
  insightB1: "10000000-0000-4000-8000-00000000d201",
  org: "10000000-0000-4000-8000-0000000000ff",
  targetA1: "10000000-0000-4000-8000-00000000e101",
  targetA2: "10000000-0000-4000-8000-00000000e102",
  targetB1: "10000000-0000-4000-8000-00000000e201",
  versionA1: "10000000-0000-4000-8000-00000000v101".replace("v", "a"),
  versionA2: "10000000-0000-4000-8000-00000000v102".replace("v", "a"),
  versionB1: "10000000-0000-4000-8000-00000000v201".replace("v", "a"),
  viewer: "10000000-0000-4000-8000-0000000000a4",
};

const authenticatedRole =
  process.env.ANALIZA_POSTGRES_AUTHENTICATED_ROLE?.trim() || "authenticated";
const adminPool = poolFor(process.env.DATABASE_ADMIN_URL);
const runtimePool = poolFor(process.env.DATABASE_URL);

async function seedFixture() {
  const client = await adminPool.connect();

  try {
    await client.query("begin");
    await client.query(
      `
        insert into auth.users (id, email)
        values
          ($1, 'ceo.rls-gate@example.invalid'),
          ($2, 'area-a.rls-gate@example.invalid'),
          ($3, 'branch-a1.rls-gate@example.invalid'),
          ($4, 'viewer.rls-gate@example.invalid')
        on conflict (id) do update set email = excluded.email
      `,
      [ids.ceo, ids.gerenteAreaA, ids.gerenteSucursalA1, ids.viewer],
    );
    await client.query(
      `
        insert into public.roles (key, name, description)
        values
          ('ceo', 'CEO', 'Lectura ejecutiva autorizada'),
          ('gerente_area', 'Gerente de area', 'Administra sucursales de su area'),
          ('gerente_sucursal', 'Gerente de sucursal', 'Administra su sucursal'),
          ('viewer', 'Viewer', 'Lectura limitada')
        on conflict (key) do update set
          name = excluded.name,
          description = excluded.description
      `,
    );
    await client.query(
      `
        insert into public.currencies (id, code, name, symbol)
        values ($1, 'USD', 'US Dollar', '$')
        on conflict (code) do update set name = excluded.name
      `,
      [ids.currency],
    );
    await client.query(
      `
        insert into public.organizations (id, name, slug, is_demo)
        values ($1, 'Analiza RLS Final Gate', 'analiza-rls-final-gate', false)
        on conflict (slug) do update set name = excluded.name, is_demo = false
      `,
      [ids.org],
    );
    await client.query(
      `
        insert into public.countries (
          id,
          organization_id,
          currency_id,
          iso2,
          name,
          time_zone,
          date_format,
          is_demo
        )
        values ($1, $2, $3, 'AA', 'Pais A', 'America/El_Salvador', 'DD/MM/YYYY', false)
        on conflict (organization_id, iso2) do update set
          name = excluded.name,
          is_demo = false
      `,
      [ids.countryA, ids.org, ids.currency],
    );
    await client.query(
      `
        insert into public.companies (id, organization_id, key, name, unit_type, is_demo)
        values ($1, $2, 'empresa-a', 'Empresa A', 'fisioterapia', false)
        on conflict (organization_id, key) do update set
          name = excluded.name,
          unit_type = excluded.unit_type,
          is_demo = false
      `,
      [ids.companyA, ids.org],
    );
    await client.query(
      `
        insert into public.operational_areas (
          id,
          organization_id,
          country_id,
          company_id,
          code,
          name,
          status
        )
        values
          ($1, $3, $4, $5, 'AREA-A', 'Area A', 'active'),
          ($2, $3, $4, $5, 'AREA-B', 'Area B', 'active')
        on conflict (organization_id, country_id, company_id, code) do update set
          name = excluded.name,
          status = excluded.status
      `,
      [ids.areaA, ids.areaB, ids.org, ids.countryA, ids.companyA],
    );
    await client.query(
      `
        insert into public.branches (
          id,
          organization_id,
          country_id,
          company_id,
          operational_area_id,
          code,
          name,
          city,
          status,
          is_demo
        )
        values
          ($1, $4, $5, $6, $7, 'A1', 'Sucursal A1', 'Ciudad A', 'active', false),
          ($2, $4, $5, $6, $7, 'A2', 'Sucursal A2', 'Ciudad A', 'active', false),
          ($3, $4, $5, $6, $8, 'B1', 'Sucursal B1', 'Ciudad B', 'active', false)
        on conflict (organization_id, country_id, company_id, code) do update set
          name = excluded.name,
          operational_area_id = excluded.operational_area_id,
          status = excluded.status,
          is_demo = false
      `,
      [
        ids.branchA1,
        ids.branchA2,
        ids.branchB1,
        ids.org,
        ids.countryA,
        ids.companyA,
        ids.areaA,
        ids.areaB,
      ],
    );
    await client.query(
      `
        insert into public.profiles (
          id,
          organization_id,
          email,
          display_name,
          status,
          default_country_id,
          default_company_id,
          default_branch_id
        )
        values
          ($1, $5, 'ceo.rls-gate@example.invalid', 'CEO RLS Gate', 'active', $6, $7, null),
          ($2, $5, 'area-a.rls-gate@example.invalid', 'Gerente Area A RLS Gate', 'active', $6, $7, null),
          ($3, $5, 'branch-a1.rls-gate@example.invalid', 'Gerente Sucursal A1 RLS Gate', 'active', $6, $7, $8),
          ($4, $5, 'viewer.rls-gate@example.invalid', 'Viewer RLS Gate', 'active', $6, $7, null)
        on conflict (id) do update set
          organization_id = excluded.organization_id,
          email = excluded.email,
          display_name = excluded.display_name,
          status = 'active',
          default_country_id = excluded.default_country_id,
          default_company_id = excluded.default_company_id,
          default_branch_id = excluded.default_branch_id
      `,
      [
        ids.ceo,
        ids.gerenteAreaA,
        ids.gerenteSucursalA1,
        ids.viewer,
        ids.org,
        ids.countryA,
        ids.companyA,
        ids.branchA1,
      ],
    );
    const userIds = [
      ids.ceo,
      ids.gerenteAreaA,
      ids.gerenteSucursalA1,
      ids.viewer,
    ];

    await client.query(
      "delete from public.user_branch_access where user_id = any($1::uuid[])",
      [userIds],
    );
    await client.query(
      "delete from public.user_company_access where user_id = any($1::uuid[])",
      [userIds],
    );
    await client.query(
      "delete from public.user_country_access where user_id = any($1::uuid[])",
      [userIds],
    );
    await client.query(
      "delete from public.user_roles where user_id = any($1::uuid[])",
      [userIds],
    );
    await client.query(
      `
        insert into public.user_roles (
          user_id,
          role_id,
          organization_id,
          country_id,
          company_id,
          operational_area_id,
          branch_id,
          status
        )
        select fixture.user_id, r.id, fixture.organization_id, fixture.country_id,
          fixture.company_id, fixture.operational_area_id, fixture.branch_id, 'active'
        from (
          values
            ($1::uuid, 'ceo', $5::uuid, $6::uuid, $7::uuid, null::uuid, null::uuid),
            ($2::uuid, 'gerente_area', $5::uuid, $6::uuid, $7::uuid, $8::uuid, null::uuid),
            ($3::uuid, 'gerente_sucursal', $5::uuid, $6::uuid, $7::uuid, $8::uuid, $9::uuid),
            ($4::uuid, 'viewer', $5::uuid, $6::uuid, $7::uuid, null::uuid, null::uuid)
        ) as fixture(
          user_id,
          role_key,
          organization_id,
          country_id,
          company_id,
          operational_area_id,
          branch_id
        )
        join public.roles r on r.key = fixture.role_key
      `,
      [
        ids.ceo,
        ids.gerenteAreaA,
        ids.gerenteSucursalA1,
        ids.viewer,
        ids.org,
        ids.countryA,
        ids.companyA,
        ids.areaA,
        ids.branchA1,
      ],
    );
    await client.query(
      `
        insert into public.user_branch_access (user_id, branch_id)
        values ($1, $2)
        on conflict do nothing
      `,
      [ids.gerenteSucursalA1, ids.branchA1],
    );
    await client.query(
      `
        update public.monthly_closings
        set active_version_id = null, published_version_id = null
        where organization_id = $1
      `,
      [ids.org],
    );
    await client.query(
      "delete from public.generated_insights where organization_id = $1",
      [ids.org],
    );
    await client.query(
      "delete from public.kpi_targets where organization_id = $1",
      [ids.org],
    );

    for (const tableName of [
      "closing_kpi_results",
      "closing_validation_results",
      "physiotherapy_closing_inputs",
      "laboratory_closing_inputs",
      "imaging_closing_inputs",
    ]) {
      await client.query(
        `
          delete from public.${tableName}
          where closing_version_id in (
            select id from public.closing_versions where organization_id = $1
          )
        `,
        [ids.org],
      );
    }

    await client.query(
      "delete from public.closing_versions where organization_id = $1",
      [ids.org],
    );
    await client.query(
      "delete from public.monthly_closings where organization_id = $1",
      [ids.org],
    );
    await client.query(
      `
        insert into public.monthly_closings (
          id,
          organization_id,
          country_id,
          company_id,
          branch_id,
          business_line,
          period_month,
          current_status,
          is_demo,
          created_by,
          created_by_email
        )
        values
          ($1, $4, $5, $6, $7, 'PHYSIOTHERAPY', '2026-06-01', 'PUBLISHED', false, $10, 'ceo.rls-gate@example.invalid'),
          ($2, $4, $5, $6, $8, 'LABORATORY', '2026-06-01', 'PUBLISHED', false, $10, 'ceo.rls-gate@example.invalid'),
          ($3, $4, $5, $6, $9, 'IMAGING', '2026-06-01', 'PUBLISHED', false, $10, 'ceo.rls-gate@example.invalid')
      `,
      [
        ids.closingA1,
        ids.closingA2,
        ids.closingB1,
        ids.org,
        ids.countryA,
        ids.companyA,
        ids.branchA1,
        ids.branchA2,
        ids.branchB1,
        ids.ceo,
      ],
    );
    await client.query(
      `
        insert into public.closing_versions (
          id,
          monthly_closing_id,
          organization_id,
          country_id,
          company_id,
          branch_id,
          business_line,
          period_month,
          version_number,
          status,
          data_quality_score,
          submitted_by,
          submitted_by_email,
          published_at,
          published_by,
          published_by_email,
          is_demo
        )
        values
          ($1, $4, $7, $8, $9, $10, 'PHYSIOTHERAPY', '2026-06-01', 1, 'PUBLISHED', 94, $13, 'ceo.rls-gate@example.invalid', now(), $13, 'ceo.rls-gate@example.invalid', false),
          ($2, $5, $7, $8, $9, $11, 'LABORATORY', '2026-06-01', 1, 'PUBLISHED', 91, $13, 'ceo.rls-gate@example.invalid', now(), $13, 'ceo.rls-gate@example.invalid', false),
          ($3, $6, $7, $8, $9, $12, 'IMAGING', '2026-06-01', 1, 'PUBLISHED', 89, $13, 'ceo.rls-gate@example.invalid', now(), $13, 'ceo.rls-gate@example.invalid', false)
      `,
      [
        ids.versionA1,
        ids.versionA2,
        ids.versionB1,
        ids.closingA1,
        ids.closingA2,
        ids.closingB1,
        ids.org,
        ids.countryA,
        ids.companyA,
        ids.branchA1,
        ids.branchA2,
        ids.branchB1,
        ids.ceo,
      ],
    );
    await client.query(
      `
        update public.monthly_closings
        set active_version_id = fixture.version_id,
            published_version_id = fixture.version_id
        from (
          values
            ($1::uuid, $4::uuid),
            ($2::uuid, $5::uuid),
            ($3::uuid, $6::uuid)
        ) as fixture(closing_id, version_id)
        where monthly_closings.id = fixture.closing_id
      `,
      [
        ids.closingA1,
        ids.closingA2,
        ids.closingB1,
        ids.versionA1,
        ids.versionA2,
        ids.versionB1,
      ],
    );
    await client.query(
      `
        insert into public.closing_kpi_results (
          closing_version_id,
          kpi_id,
          label,
          formula,
          status,
          unit,
          value
        )
        values
          ($1, 'revenue_total', 'Facturacion', 'source', 'CALCULABLE', 'currency', 1000),
          ($2, 'revenue_total', 'Facturacion', 'source', 'CALCULABLE', 'currency', 1200),
          ($3, 'revenue_total', 'Facturacion', 'source', 'CALCULABLE', 'currency', 900)
      `,
      [ids.versionA1, ids.versionA2, ids.versionB1],
    );
    await client.query(
      `
        insert into public.kpi_targets (
          id,
          organization_id,
          country_id,
          company_id,
          branch_id,
          business_line,
          period_month,
          kpi_id,
          label,
          target_type,
          direction,
          target_value,
          unit,
          status,
          is_demo,
          created_by,
          created_by_email,
          approved_by,
          approved_by_email,
          approved_at
        )
        values
          ($1, $4, $5, $6, $7, 'PHYSIOTHERAPY', '2026-06-01', 'revenue_total', 'Facturacion', 'SINGLE_VALUE', 'HIGHER_IS_BETTER', 950, 'currency', 'active', false, $10, 'ceo.rls-gate@example.invalid', $10, 'ceo.rls-gate@example.invalid', now()),
          ($2, $4, $5, $6, $8, 'LABORATORY', '2026-06-01', 'revenue_total', 'Facturacion', 'SINGLE_VALUE', 'HIGHER_IS_BETTER', 1100, 'currency', 'active', false, $10, 'ceo.rls-gate@example.invalid', $10, 'ceo.rls-gate@example.invalid', now()),
          ($3, $4, $5, $6, $9, 'IMAGING', '2026-06-01', 'revenue_total', 'Facturacion', 'SINGLE_VALUE', 'HIGHER_IS_BETTER', 1000, 'currency', 'active', false, $10, 'ceo.rls-gate@example.invalid', $10, 'ceo.rls-gate@example.invalid', now())
      `,
      [
        ids.targetA1,
        ids.targetA2,
        ids.targetB1,
        ids.org,
        ids.countryA,
        ids.companyA,
        ids.branchA1,
        ids.branchA2,
        ids.branchB1,
        ids.ceo,
      ],
    );
    await client.query(
      `
        insert into public.generated_insights (
          id,
          closing_version_id,
          rule_key,
          severity,
          kpi_id,
          organization_id,
          country_id,
          company_id,
          branch_id,
          business_line,
          period_month,
          title,
          message,
          comparison,
          impact,
          recommended_action,
          evidence
        )
        values
          ($1, $4, 'rls-a1', 'positiva', 'revenue_total', $7, $8, $9, $10, 'PHYSIOTHERAPY', '2026-06-01', 'A1 en meta', 'A1 supera la meta.', 'vs meta', 'positivo', 'Mantener seguimiento.', 'fixture'),
          ($2, $5, 'rls-a2', 'media', 'revenue_total', $7, $8, $9, $11, 'LABORATORY', '2026-06-01', 'A2 en seguimiento', 'A2 requiere seguimiento.', 'vs meta', 'medio', 'Revisar variacion.', 'fixture'),
          ($3, $6, 'rls-b1', 'alta', 'revenue_total', $7, $8, $9, $12, 'IMAGING', '2026-06-01', 'B1 en riesgo', 'B1 requiere atencion.', 'vs meta', 'alto', 'Revisar capacidad.', 'fixture')
      `,
      [
        ids.insightA1,
        ids.insightA2,
        ids.insightB1,
        ids.versionA1,
        ids.versionA2,
        ids.versionB1,
        ids.org,
        ids.countryA,
        ids.companyA,
        ids.branchA1,
        ids.branchA2,
        ids.branchB1,
      ],
    );
    await client.query(
      `
        insert into public.audit_logs (
          organization_id,
          actor_user_id,
          action,
          entity_table,
          entity_id,
          country_id,
          company_id,
          branch_id,
          metadata
        )
        values (
          $1,
          $2,
          'rls_gate.sensitive_admin_event',
          'user_roles',
          $2,
          $3,
          $4,
          null,
          '{"fixture":"rls_final_gate"}'::jsonb
        )
      `,
      [ids.org, ids.ceo, ids.countryA, ids.companyA],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function withRlsUser(client, userId, work) {
  await client.query("begin");

  try {
    await client.query(`set local role ${quotePostgresIdentifier(authenticatedRole)}`);
    await client.query(
      `
        select
          set_config('request.jwt.claim.sub', $1, true),
          set_config('request.jwt.claim.role', $2, true)
      `,
      [userId, authenticatedRole],
    );

    const result = await work();

    await client.query("rollback");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function visibleBranchCodes(client, userId) {
  return withRlsUser(client, userId, async () => {
    const result = await client.query(
      `
        select code
        from public.branches
        where id = any($1::uuid[])
        order by code
      `,
      [[ids.branchA1, ids.branchA2, ids.branchB1]],
    );

    return result.rows.map((row) => row.code);
  });
}

async function countRows(client, userId, sql, params = []) {
  return withRlsUser(client, userId, async () => {
    const result = await client.query(sql, params);
    return Number(result.rows[0].count);
  });
}

try {
  await seedFixture();

  const client = await runtimePool.connect();

  try {
    const roleResult = await client.query(`
      select
        current_user,
        rolsuper,
        rolbypassrls,
        rolcreatedb,
        rolcreaterole
      from pg_roles
      where rolname = current_user
    `);
    const runtimeRole = roleResult.rows[0];

    assert.ok(runtimeRole, "PostgreSQL runtime role must be visible.");
    assertSafePostgresRuntimeRole(runtimeRole);
    assert.equal(runtimeRole.rolcreatedb, false, "Runtime role must not create databases.");
    assert.equal(runtimeRole.rolcreaterole, false, "Runtime role must not create roles.");

    const membershipResult = await client.query(
      `
        select pg_has_role(current_user, $1, 'member') as is_member
      `,
      [authenticatedRole],
    );

    assert.equal(
      membershipResult.rows[0]?.is_member,
      true,
      "Runtime role must be a member of the configured authenticated role.",
    );

    const branchManagerVisible = await visibleBranchCodes(
      client,
      ids.gerenteSucursalA1,
    );
    assert.deepEqual(branchManagerVisible, ["A1"]);

    const branchManagerA2 = await countRows(
      client,
      ids.gerenteSucursalA1,
      "select count(*) from public.monthly_closings where branch_id = $1",
      [ids.branchA2],
    );
    const branchManagerB1 = await countRows(
      client,
      ids.gerenteSucursalA1,
      "select count(*) from public.monthly_closings where branch_id = $1",
      [ids.branchB1],
    );
    assert.equal(branchManagerA2, 0);
    assert.equal(branchManagerB1, 0);

    const areaManagerVisible = await visibleBranchCodes(client, ids.gerenteAreaA);
    assert.deepEqual(areaManagerVisible, ["A1", "A2"]);

    const areaManagerB1 = await countRows(
      client,
      ids.gerenteAreaA,
      "select count(*) from public.monthly_closings where branch_id = $1",
      [ids.branchB1],
    );
    assert.equal(areaManagerB1, 0);

    const viewerAuditRows = await countRows(
      client,
      ids.viewer,
      "select count(*) from public.audit_logs where organization_id = $1",
      [ids.org],
    );
    assert.equal(viewerAuditRows, 0);

    const ceoClosings = await countRows(
      client,
      ids.ceo,
      "select count(*) from public.monthly_closings where organization_id = $1",
      [ids.org],
    );
    const ceoInsights = await countRows(
      client,
      ids.ceo,
      "select count(*) from public.generated_insights where organization_id = $1",
      [ids.org],
    );
    const ceoTargets = await countRows(
      client,
      ids.ceo,
      "select count(*) from public.kpi_targets where organization_id = $1",
      [ids.org],
    );
    const ceoAuditRows = await countRows(
      client,
      ids.ceo,
      "select count(*) from public.audit_logs where organization_id = $1",
      [ids.org],
    );

    assert.equal(ceoClosings, 3);
    assert.equal(ceoInsights, 3);
    assert.equal(ceoTargets, 3);
    assert.ok(ceoAuditRows >= 1);

    console.log(
      JSON.stringify(
        {
          areaManagerVisible,
          branchManagerVisible,
          ceoClosings,
          ceoInsights,
          ceoTargets,
          runtimeRole: runtimeRole.current_user,
        },
        null,
        2,
      ),
    );
  } finally {
    client.release();
  }
} finally {
  await adminPool.end();
  await runtimePool.end();
}
