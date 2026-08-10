import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

const databaseUrl =
  process.env.ANALIZA_PERSISTENCE_GATE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("Skipping laboratory persistence E2E: DATABASE_URL is not set.");
  process.exit(0);
}

process.env.ANALIZA_APP_ENV = "staging";
process.env.APP_ENV = "staging";
process.env.DATABASE_URL = databaseUrl;

const organizationId = "10000000-0000-4000-8000-000000000001";
const countryId = "30000000-0000-4000-8000-000000000004";
const companyId = "40000000-0000-4000-8000-000000000002";
const otherBranchId = "50000000-0000-4000-8000-000000000004";
const period = "2026-07";

const runId = (process.env.ANALIZA_PERSISTENCE_GATE_RUN_ID ?? randomUUID())
  .replace(/-/g, "")
  .slice(0, 10);
const gateBranchId =
  process.env.ANALIZA_PERSISTENCE_GATE_BRANCH_ID ?? randomUUID();
const gateAreaId = process.env.ANALIZA_PERSISTENCE_GATE_AREA_ID ?? randomUUID();
const branchManagerUserId =
  process.env.ANALIZA_PERSISTENCE_GATE_BRANCH_MANAGER_ID ?? randomUUID();
const areaManagerUserId =
  process.env.ANALIZA_PERSISTENCE_GATE_AREA_MANAGER_ID ?? randomUUID();
const operationsUserId =
  process.env.ANALIZA_PERSISTENCE_GATE_OPERATIONS_ID ?? randomUUID();
const ceoUserId = process.env.ANALIZA_PERSISTENCE_GATE_CEO_ID ?? randomUUID();
const viewerUserId =
  process.env.ANALIZA_PERSISTENCE_GATE_VIEWER_ID ?? randomUUID();

const pool = new Pool({ connectionString: databaseUrl });

function actor(roleKey, userId, scope) {
  return {
    allowDemoRoleSwitch: false,
    email: `${roleKey}.${runId}@analiza.local`,
    roleKey,
    scope: {
      organizationId,
      ...scope,
    },
    source: "local",
    userId,
  };
}

const branchManager = actor("gerente_sucursal", branchManagerUserId, {
  branchId: gateBranchId,
  companyId,
  countryId,
  operationalAreaId: gateAreaId,
});
const areaManager = actor("gerente_area", areaManagerUserId, {
  companyId,
  countryId,
  operationalAreaId: gateAreaId,
});
const operationsManager = actor("gerente_operaciones", operationsUserId, {
  companyId,
});
const ceo = actor("ceo", ceoUserId, {});
const viewer = actor("viewer", viewerUserId, {
  branchId: gateBranchId,
  companyId,
  countryId,
  operationalAreaId: gateAreaId,
});

const validPayload = (branchId) => ({
  branchId,
  inputs: {
    analizaOrders: 720,
    analizaRevenue: 82000,
    averageTurnaroundTimeHours: 20,
    cardRevenue: 74000,
    cashRevenue: 27000,
    clientsTotal: 1020,
    closureObservations: `Gate local laboratorio ${runId} sin datos personales.`,
    costOfSales: 83000,
    creditRevenue: 29000,
    customerServiceCount: 5,
    drsvClients: 300,
    drsvOrders: 360,
    drsvRevenue: 41000,
    homeServiceOrders: 80,
    homeServiceRevenue: 12000,
    mixedPaymentRevenue: 17000,
    nurseCount: 2,
    ordersTotal: 1260,
    phlebotomistCount: 6,
    processedTests: 5200,
    profilesTotal: 420,
    referredOrders: 100,
    referredRevenue: 12000,
    rejectedTests: 18,
    reprocessedTests: 26,
    revenueTotal: 147000,
    technicalCapacityTests: 6400,
    technicalStaffCount: 8,
  },
  period,
});

async function setupFixtureData() {
  await pool.query(
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
      values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, 'active')
      on conflict (organization_id, country_id, company_id, code) do update set
        name = excluded.name,
        status = 'active',
        deleted_at = null
    `,
    [
      gateAreaId,
      organizationId,
      countryId,
      companyId,
      `GATE-LAB-${runId}`,
      `Area Gate Laboratorio ${runId}`,
    ],
  );
  await pool.query(
    `
      insert into public.branches (
        id,
        organization_id,
        country_id,
        company_id,
        code,
        name,
        city,
        time_zone,
        is_enabled,
        is_demo,
        operational_area_id,
        status
      )
      values (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        $5,
        $6,
        'San Salvador',
        'America/El_Salvador',
        true,
        true,
        $7::uuid,
        'active'
      )
      on conflict (id) do update set
        code = excluded.code,
        name = excluded.name,
        is_enabled = true,
        is_demo = true,
        operational_area_id = excluded.operational_area_id,
        status = 'active',
        deleted_at = null
    `,
    [
      gateBranchId,
      organizationId,
      countryId,
      companyId,
      `GATE-LAB-${runId}`,
      `Sucursal Gate Laboratorio ${runId}`,
      gateAreaId,
    ],
  );
  await pool.query(
    `
      insert into public.branch_managers (
        organization_id,
        branch_id,
        display_name,
        email,
        is_demo,
        starts_on
      )
      values ($1::uuid, $2::uuid, $3, $4, true, '2026-01-01')
    `,
    [
      organizationId,
      gateBranchId,
      `Gerente Gate Laboratorio ${runId}`,
      `gerente.lab.gate.${runId}@analiza.local`,
    ],
  );

  for (const [userId, email, roleKey, scope] of [
    [
      branchManagerUserId,
      branchManager.email,
      "gerente_sucursal",
      {
        branchId: gateBranchId,
        companyId,
        countryId,
        operationalAreaId: gateAreaId,
      },
    ],
    [
      areaManagerUserId,
      areaManager.email,
      "gerente_area",
      { branchId: null, companyId, countryId, operationalAreaId: gateAreaId },
    ],
    [
      operationsUserId,
      operationsManager.email,
      "gerente_operaciones",
      { branchId: null, companyId, countryId: null, operationalAreaId: null },
    ],
    [
      ceoUserId,
      ceo.email,
      "ceo",
      { branchId: null, companyId: null, countryId: null, operationalAreaId: null },
    ],
    [
      viewerUserId,
      viewer.email,
      "viewer",
      {
        branchId: gateBranchId,
        companyId,
        countryId,
        operationalAreaId: gateAreaId,
      },
    ],
  ]) {
    await pool.query(
      `
        insert into auth.users (id, email, email_confirmed_at)
        values ($1::uuid, $2, now())
        on conflict (id) do update set email = excluded.email
      `,
      [userId, email],
    );
    await pool.query(
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
        values ($1::uuid, $2::uuid, $3, $4, 'active', $5::uuid, $6::uuid, $7::uuid)
        on conflict (id) do update set
          organization_id = excluded.organization_id,
          email = excluded.email,
          display_name = excluded.display_name,
          status = 'active',
          default_country_id = excluded.default_country_id,
          default_company_id = excluded.default_company_id,
          default_branch_id = excluded.default_branch_id,
          deactivated_at = null,
          deleted_at = null
      `,
      [
        userId,
        organizationId,
        email,
        email.split("@")[0],
        scope.countryId,
        scope.companyId,
        scope.branchId,
      ],
    );
    await pool.query(
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
        select
          $1::uuid,
          r.id,
          $2::uuid,
          $3::uuid,
          $4::uuid,
          $5::uuid,
          $6::uuid,
          'active'
        from public.roles r
        where r.key = $7
      `,
      [
        userId,
        organizationId,
        scope.countryId,
        scope.companyId,
        scope.operationalAreaId,
        scope.branchId,
        roleKey,
      ],
    );

    if (scope.countryId) {
      await pool.query(
        `
          insert into public.user_country_access (user_id, country_id)
          values ($1::uuid, $2::uuid)
          on conflict do nothing
        `,
        [userId, scope.countryId],
      );
    }

    if (scope.companyId) {
      await pool.query(
        `
          insert into public.user_company_access (user_id, company_id)
          values ($1::uuid, $2::uuid)
          on conflict do nothing
        `,
        [userId, scope.companyId],
      );
    }

    if (scope.branchId) {
      await pool.query(
        `
          insert into public.user_branch_access (user_id, branch_id)
          values ($1::uuid, $2::uuid)
          on conflict do nothing
        `,
        [userId, scope.branchId],
      );
    }
  }

  await pool.query(
    `
      insert into public.manager_assignments (
        organization_id,
        profile_id,
        role_id,
        country_id,
        company_id,
        operational_area_id,
        status,
        starts_at
      )
      select $1::uuid, $2::uuid, r.id, $3::uuid, $4::uuid, $5::uuid, 'active', now()
      from public.roles r
      where r.key = 'gerente_area'
    `,
    [organizationId, areaManagerUserId, countryId, companyId, gateAreaId],
  );
}

async function assertPersistenceRows(closureId) {
  const result = await pool.query(
    `
      select
        (select count(*)::int from public.closing_versions where id = $1::uuid) as versions,
        (select count(*)::int from public.laboratory_closing_inputs where closing_version_id = $1::uuid) as inputs,
        (select count(*)::int from public.closing_validation_results where closing_version_id = $1::uuid) as validation_results,
        (select count(*)::int from public.closing_kpi_results where closing_version_id = $1::uuid) as kpi_results,
        (select count(*)::int from public.generated_insights where closing_version_id = $1::uuid) as insights,
        (select count(*)::int from public.closing_audit_events where closing_version_id = $1::uuid) as audit_events
    `,
    [closureId],
  );
  const row = result.rows[0];

  assert.equal(row.versions, 1, "closing version must be persisted.");
  assert.equal(row.inputs, 1, "laboratory source inputs must be persisted.");
  assert.equal(
    row.validation_results,
    1,
    "validation result must be persisted.",
  );
  assert.ok(row.kpi_results >= 18, "KPI results must be persisted.");
  assert.ok(row.insights > 0, "generated insights must be persisted.");
  assert.ok(row.audit_events > 0, "audit events must be persisted.");
}

async function assertWorkspaceHasClosure(actorToCheck, closureId, label) {
  const { getLaboratoryWorkspace } = await import(
    "../lib/analytics/laboratory-closures.ts"
  );
  const workspace = await getLaboratoryWorkspace(actorToCheck, { period });

  assert.ok(
    workspace.closures.some((closure) => closure.id === closureId),
    `${label} must read the same laboratory closing version.`,
  );
  assert.ok(
    workspace.publishedClosures.some((closure) => closure.id === closureId),
    `${label} must consolidate the published laboratory closing.`,
  );

  return workspace;
}

async function assertRlsFunctionAccess(userId, branchId, expected, label) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
      userId,
    ]);
    const result = await client.query(
      "select public.current_user_can_access_branch($1::uuid) as allowed",
      [branchId],
    );
    await client.query("rollback");
    assert.equal(result.rows[0].allowed, expected, label);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyRestartOnly() {
  const closureId = process.env.ANALIZA_PERSISTENCE_GATE_CLOSURE_ID;

  assert.ok(closureId, "Restart verification requires a closure id.");
  await assertPersistenceRows(closureId);
  await assertWorkspaceHasClosure(
    branchManager,
    closureId,
    "Branch manager after restart",
  );
  await assertWorkspaceHasClosure(areaManager, closureId, "Area after restart");
  await assertWorkspaceHasClosure(
    operationsManager,
    closureId,
    "Operations after restart",
  );
  await assertWorkspaceHasClosure(ceo, closureId, "CEO after restart");
}

if (process.argv[2] === "verify-restart") {
  await verifyRestartOnly();
  await pool.end();
  process.exit(0);
}

const {
  getLaboratoryWorkspace,
  publishLaboratoryClosure,
  saveLaboratoryClosureDraft,
  upsertLaboratoryTarget,
  validateLaboratoryClosureDraft,
} = await import("../lib/analytics/laboratory-closures.ts");

await setupFixtureData();

const initialBranchWorkspace = await getLaboratoryWorkspace(branchManager, {
  period,
});
assert.deepEqual(
  initialBranchWorkspace.branches.map((branch) => branch.branchId),
  [gateBranchId],
  "Branch manager must only see the gate laboratory branch.",
);
await assert.rejects(
  () => saveLaboratoryClosureDraft(viewer, validPayload(gateBranchId)),
  /no puede crear ni publicar/,
  "Viewer must not create laboratory closures.",
);

await upsertLaboratoryTarget(operationsManager, {
  branchId: gateBranchId,
  kpiId: "facturacion_neta",
  period,
  targetValue: 180000,
});
await upsertLaboratoryTarget(operationsManager, {
  branchId: gateBranchId,
  kpiId: "perfiles_total",
  period,
  targetValue: 600,
});
await upsertLaboratoryTarget(operationsManager, {
  branchId: gateBranchId,
  direction: "LOWER_IS_BETTER",
  kpiId: "tasa_rechazo",
  period,
  targetValue: 0.01,
});

const draft = await saveLaboratoryClosureDraft(
  branchManager,
  validPayload(gateBranchId),
);
assert.equal(draft.status, "draft", "Laboratory draft must be persisted.");

const autosaved = await saveLaboratoryClosureDraft(branchManager, {
  ...validPayload(gateBranchId),
  id: draft.id,
  inputs: {
    ...validPayload(gateBranchId).inputs,
    closureObservations: `Autosave gate laboratorio ${runId} sin datos personales.`,
    profilesTotal: 430,
  },
});
assert.equal(autosaved.id, draft.id, "Autosave must update the same draft.");

const recoveredWorkspace = await getLaboratoryWorkspace(branchManager, {
  period,
});
assert.equal(
  recoveredWorkspace.closures.some((closure) => closure.id === draft.id),
  true,
  "Draft must be recoverable from PostgreSQL before publish.",
);

const validated = await validateLaboratoryClosureDraft(branchManager, draft.id);
assert.equal(
  validated.validation.errors.length,
  0,
  "Valid laboratory closing must validate without blocking errors.",
);

const published = await publishLaboratoryClosure(branchManager, draft.id);
assert.equal(published.status, "published", "Laboratory closing must publish.");
assert.equal(published.version, 1, "Initial published closing must be v1.");
assert.ok(
  published.kpiResults.every(
    (kpi) => Number.isFinite(kpi.value) || kpi.value === null,
  ),
  "Laboratory KPIs must not contain NaN or Infinity.",
);
assert.ok(
  published.targetComparisons.some(
    (comparison) => comparison.kpiId === "facturacion_neta",
  ),
  "Published laboratory closing must include target comparisons.",
);
await assertPersistenceRows(published.id);

await assertWorkspaceHasClosure(branchManager, published.id, "Branch manager");
await assertWorkspaceHasClosure(areaManager, published.id, "Area manager");
await assertWorkspaceHasClosure(
  operationsManager,
  published.id,
  "Operations manager",
);
await assertWorkspaceHasClosure(ceo, published.id, "CEO");

const restart = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    fileURLToPath(import.meta.url),
    "verify-restart",
  ],
  {
    env: {
      ...process.env,
      ANALIZA_PERSISTENCE_GATE_AREA_ID: gateAreaId,
      ANALIZA_PERSISTENCE_GATE_BRANCH_ID: gateBranchId,
      ANALIZA_PERSISTENCE_GATE_BRANCH_MANAGER_ID: branchManagerUserId,
      ANALIZA_PERSISTENCE_GATE_CEO_ID: ceoUserId,
      ANALIZA_PERSISTENCE_GATE_CLOSURE_ID: published.id,
      ANALIZA_PERSISTENCE_GATE_DATABASE_URL: databaseUrl,
      ANALIZA_PERSISTENCE_GATE_OPERATIONS_ID: operationsUserId,
      ANALIZA_PERSISTENCE_GATE_AREA_MANAGER_ID: areaManagerUserId,
      ANALIZA_PERSISTENCE_GATE_RUN_ID: runId,
      ANALIZA_PERSISTENCE_GATE_VIEWER_ID: viewerUserId,
      APP_ENV: "staging",
      ANALIZA_APP_ENV: "staging",
      DATABASE_URL: databaseUrl,
    },
    encoding: "utf8",
  },
);
assert.equal(restart.status, 0, restart.stderr || restart.stdout);

const correctionDraft = await saveLaboratoryClosureDraft(branchManager, {
  ...validPayload(gateBranchId),
  inputs: {
    ...validPayload(gateBranchId).inputs,
    closureObservations: `Correccion gate laboratorio ${runId} autorizada.`,
    revenueTotal: 152000,
  },
  replacesClosureId: published.id,
});
const correctionValidated = await validateLaboratoryClosureDraft(
  branchManager,
  correctionDraft.id,
);
assert.equal(
  correctionValidated.validation.errors.length,
  0,
  "Correction must validate before publish.",
);
const correction = await publishLaboratoryClosure(
  branchManager,
  correctionDraft.id,
);
assert.equal(correction.status, "published", "Correction must publish.");
assert.equal(correction.version, 2, "Correction must create v2.");
assert.equal(
  correction.replacesClosureId,
  published.id,
  "Correction must preserve previous version lineage.",
);

const versionState = await pool.query(
  `
    select
      (select status from public.closing_versions where id = $1::uuid) as original_status,
      (
        select count(*)::int
        from public.closing_versions
        where monthly_closing_id = (
          select monthly_closing_id
          from public.closing_versions
          where id = $2::uuid
        )
          and status = 'PUBLISHED'
          and superseded_by_version_id is null
      ) as active_published_count
  `,
  [published.id, correction.id],
);
assert.equal(
  versionState.rows[0].original_status,
  "SUPERSEDED",
  "Original version must be superseded.",
);
assert.equal(
  versionState.rows[0].active_published_count,
  1,
  "Only one active published version may exist.",
);
await assertPersistenceRows(correction.id);

const duplicateDraft = await saveLaboratoryClosureDraft(
  branchManager,
  validPayload(gateBranchId),
);
const duplicateValidation = await validateLaboratoryClosureDraft(
  branchManager,
  duplicateDraft.id,
);
assert.ok(
  duplicateValidation.validation.errors.some(
    (issue) => issue.code === "closure.duplicate_published",
  ),
  "Duplicate active publish must be detected during validation.",
);
await assert.rejects(
  () => publishLaboratoryClosure(branchManager, duplicateDraft.id),
  /cierre bloqueado/,
  "Duplicate active publish must be blocked.",
);

await assertRlsFunctionAccess(
  branchManagerUserId,
  gateBranchId,
  true,
  "Branch manager RLS helper must allow own branch.",
);
await assertRlsFunctionAccess(
  branchManagerUserId,
  otherBranchId,
  false,
  "Branch manager RLS helper must block another branch.",
);
await assertRlsFunctionAccess(
  areaManagerUserId,
  gateBranchId,
  true,
  "Area manager RLS helper must allow assigned area branch.",
);
await assertRlsFunctionAccess(
  operationsUserId,
  gateBranchId,
  true,
  "Operations RLS helper must allow company branch.",
);
await assertRlsFunctionAccess(
  ceoUserId,
  gateBranchId,
  true,
  "CEO RLS helper must allow executive read scope.",
);

console.log(`laboratory_closing_id=${correction.id}`);
console.log(`initial_version=${published.id}`);
console.log(`corrected_version=${correction.id}`);
console.log(`gate_branch_id=${gateBranchId}`);

await pool.end();
