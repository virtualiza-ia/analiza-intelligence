import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { readLocalSession } from "@/lib/auth/local-session";
import { validateManualSubmission } from "@/lib/manual-submissions/validation";
import { getPostgresPool } from "@/lib/server/database";

const writableRoles = new Set([
  "super_admin",
  "webmaster_admin",
  "gerente_operaciones",
  "gerente_area",
  "gerente_sucursal",
  "usuario_operativo",
]);

class CorrectionDeniedError extends Error {}
class CorrectionReasonRequiredError extends Error {}
class VersionConflictError extends Error {}

type BranchAccessRow = {
  branch_id: string;
  company_id: string;
  country_id: string;
  organization_id: string;
};

type SubmissionRow = {
  active_version: number;
  id: string;
  status: string;
};

type ManualSubmissionListRow = {
  answers: Record<string, string>;
  branch_id: string;
  branch_name: string;
  business_line: string;
  created_at: string;
  id: string;
  period: string;
  quality_score: number;
  status: string;
  updated_at: string;
  version_number: number;
};

async function getAuthenticatedUser() {
  return readLocalSession(await cookies());
}

async function withDatabaseTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
) {
  const client = await getPostgresPool().connect();

  try {
    await client.query("begin");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error: unknown) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Sesion requerida." }, { status: 401 });
  }

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const businessLine = url.searchParams.get("businessLine");
  const period = url.searchParams.get("period");

  if (
    (branchId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        branchId,
      )) ||
    (businessLine && !["Laboratorio", "Fisioterapia", "Imagenes"].includes(businessLine)) ||
    (period && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
  ) {
    return NextResponse.json({ error: "Filtros invalidos." }, { status: 400 });
  }

  const result = await withDatabaseTransaction(async (client) =>
    client.query<ManualSubmissionListRow>(
      `select
         s.id, s.branch_id, b.name as branch_name, s.business_line,
         to_char(s.period, 'YYYY-MM') as period, s.status,
         to_char(s.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at,
         v.version_number, v.answers, v.quality_score,
         to_char(v.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
       from public.manual_monthly_submissions s
       join public.branches b on b.id = s.branch_id
       join public.profiles p on p.id = $1 and p.organization_id = s.organization_id
       join public.manual_monthly_submission_versions v
         on v.submission_id = s.id and v.version_number = s.active_version
       where ($3::uuid is null or s.branch_id = $3)
         and ($4::text is null or s.business_line = $4)
         and ($5::date is null or s.period = $5)
         and exists (
           select 1
           from public.user_roles ur
           join public.roles r on r.id = ur.role_id
           where ur.user_id = $1
             and r.key = $2
             and ur.organization_id = s.organization_id
             and coalesce(ur.status, 'active') = 'active'
             and (
               r.key in ('super_admin', 'webmaster_admin', 'ceo')
               or (r.key = 'gerente_operaciones' and (ur.company_id is null or ur.company_id = s.company_id))
               or (r.key = 'gerente_area' and ur.operational_area_id = b.operational_area_id)
               or ur.branch_id = s.branch_id
               or exists (
                 select 1 from public.user_branch_access uba
                 where uba.user_id = $1 and uba.branch_id = s.branch_id
               )
               or exists (
                 select 1 from public.user_company_access uca
                 where uca.user_id = $1 and uca.company_id = s.company_id
               )
             )
         )
       order by s.period desc, s.updated_at desc
       limit 50`,
      [
        user.userId,
        user.roleKey,
        branchId,
        businessLine,
        period ? `${period}-01` : null,
      ],
    ),
  );

  return NextResponse.json({
    submissions: result.rows.map((row) => ({
      answers: row.answers,
      branchId: row.branch_id,
      branchName: row.branch_name,
      businessLine: row.business_line,
      createdAt: row.created_at,
      id: row.id,
      period: row.period,
      qualityScore: row.quality_score,
      status: row.status,
      updatedAt: row.updated_at,
      version: row.version_number,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Sesion requerida." }, { status: 401 });
  }

  if (!writableRoles.has(user.roleKey)) {
    return NextResponse.json({ error: "No tienes permiso para capturar cierres." }, { status: 403 });
  }

  const validation = validateManualSubmission(
    await request.json().catch(() => null),
  );

  if (!validation.input) {
    return NextResponse.json(
      { error: "El cierre no paso validacion.", errors: validation.errors },
      { status: 400 },
    );
  }

  const input = validation.input;

  const result = await withDatabaseTransaction(async (client) => {
    const branchResult = await client.query<BranchAccessRow>(
      `select b.id as branch_id, b.organization_id, b.country_id, b.company_id
       from public.branches b
       join public.companies company on company.id = b.company_id
       join public.profiles p on p.id = $1 and p.organization_id = b.organization_id
       where b.id = $2
         and company.unit_type = case $4::text
           when 'Laboratorio' then 'laboratorio'
           when 'Fisioterapia' then 'fisioterapia'
           when 'Imagenes' then 'imagenes'
         end
         and exists (
           select 1
           from public.user_roles ur
           join public.roles r on r.id = ur.role_id
           where ur.user_id = $1
             and r.key = $3
             and ur.organization_id = b.organization_id
             and coalesce(ur.status, 'active') = 'active'
             and (
               r.key in ('super_admin', 'webmaster_admin')
               or (r.key = 'gerente_operaciones' and (ur.company_id is null or ur.company_id = b.company_id))
               or (r.key = 'gerente_area' and ur.operational_area_id = b.operational_area_id)
               or ur.branch_id = b.id
               or exists (
                 select 1 from public.user_branch_access uba
                 where uba.user_id = $1 and uba.branch_id = b.id
               )
             )
         )
       limit 1`,
      [user.userId, input.branchId, user.roleKey, input.businessLine],
    );
    const branch = branchResult.rows[0];

    if (!branch) {
      return { denied: true as const };
    }

    const submissionResult = await client.query<SubmissionRow>(
      `insert into public.manual_monthly_submissions (
         organization_id, country_id, company_id, branch_id, business_line,
         period, status, created_by, updated_by
       ) values ($1, $2, $3, $4, $5, ($6 || '-01')::date, 'DRAFT', $7, $7)
       on conflict (organization_id, branch_id, business_line, period)
       do update set updated_by = excluded.updated_by, updated_at = now()
       returning id, active_version, status`,
      [
        branch.organization_id,
        branch.country_id,
        branch.company_id,
        branch.branch_id,
        input.businessLine,
        input.period,
        user.userId,
      ],
    );
    const submission = submissionResult.rows[0];

    if (!submission) throw new Error("Manual submission upsert returned no row.");

    if (
      input.expectedVersion !== undefined &&
      input.expectedVersion !== submission.active_version
    ) {
      throw new VersionConflictError();
    }

    if (
      submission.status === "PUBLISHED" &&
      !["super_admin", "webmaster_admin"].includes(user.roleKey)
    ) {
      throw new CorrectionDeniedError();
    }

    if (
      submission.status === "PUBLISHED" &&
      (input.answers.correction_reason?.trim().length ?? 0) < 10
    ) {
      throw new CorrectionReasonRequiredError();
    }

    const activeVersionResult = await client.query<{ exists: boolean }>(
      `select exists (
         select 1
         from public.manual_monthly_submission_versions
         where submission_id = $1 and version_number = $2
       ) as exists`,
      [submission.id, submission.active_version],
    );
    const nextVersion = activeVersionResult.rows[0]?.exists
      ? submission.active_version + 1
      : submission.active_version;
    const status = input.action === "publish" ? "PUBLISHED" : "DRAFT";

    const replacedVersions = status === "PUBLISHED"
      ? await client.query<{ id: string }>(
        `update public.manual_monthly_submission_versions
         set status = 'REPLACED'
         where submission_id = $1 and status = 'PUBLISHED'
         returning id`,
        [submission.id],
      )
      : { rows: [] };

    const versionResult = await client.query<{ id: string }>(
      `insert into public.manual_monthly_submission_versions (
         submission_id, version_number, answers, validation_results,
         quality_score, status, created_by, published_by, published_at
       ) values ($1, $2, $3::jsonb, $4::jsonb, $5::integer, $6::text, $7::uuid,
         case when $6::text = 'PUBLISHED' then $7::uuid else null end,
         case when $6::text = 'PUBLISHED' then now() else null end)
       on conflict (submission_id, version_number)
       do update set
         answers = excluded.answers,
         validation_results = excluded.validation_results,
         quality_score = excluded.quality_score,
         status = excluded.status,
         published_by = excluded.published_by,
         published_at = excluded.published_at
       where public.manual_monthly_submission_versions.status <> 'PUBLISHED'
       returning id`,
      [
        submission.id,
        nextVersion,
        JSON.stringify(input.answers),
        JSON.stringify(input.validationResults),
        input.qualityScore,
        status,
        user.userId,
      ],
    );
    const version = versionResult.rows[0];

    if (!version) {
      return { conflict: true as const };
    }

    for (const replacedVersion of replacedVersions.rows) {
      await client.query(
        `insert into public.manual_monthly_submission_events (
           submission_id, version_id, actor_id, event_type, metadata
         ) values ($1, $2, $3, 'REPLACED', jsonb_build_object(
           'replacementVersion', $4::integer,
           'reason', $5::text
         ))`,
        [
          submission.id,
          replacedVersion.id,
          user.userId,
          nextVersion,
          input.answers.correction_reason,
        ],
      );
    }

    await client.query(
      `update public.manual_monthly_submissions
       set active_version = $2, status = $3, updated_by = $4, updated_at = now()
       where id = $1`,
      [submission.id, nextVersion, status, user.userId],
    );
    await client.query(
      `insert into public.manual_monthly_submission_events (
         submission_id, version_id, actor_id, event_type, metadata
       ) values ($1, $2, $3, $4, jsonb_build_object('qualityScore', $5::integer))`,
      [
        submission.id,
        version.id,
        user.userId,
        status === "PUBLISHED" ? "PUBLISHED" : "DRAFT_SAVED",
        input.qualityScore,
      ],
    );

    return {
      id: submission.id,
      status,
      version: nextVersion,
      qualityScore: input.qualityScore,
    };
  }).catch((error: unknown) => {
    if (error instanceof CorrectionDeniedError) {
      return { correctionDenied: true as const };
    }

    if (error instanceof CorrectionReasonRequiredError) {
      return { correctionReasonRequired: true as const };
    }

    if (error instanceof VersionConflictError) {
      return { versionConflict: true as const };
    }

    throw error;
  });

  if ("denied" in result) {
    return NextResponse.json({ error: "Sucursal fuera de tu alcance." }, { status: 403 });
  }

  if ("conflict" in result) {
    return NextResponse.json(
      { error: "La version publicada es inmutable; crea una correccion nueva." },
      { status: 409 },
    );
  }

  if ("correctionDenied" in result) {
    return NextResponse.json(
      { error: "Solo un administrador puede reemplazar un cierre publicado." },
      { status: 403 },
    );
  }

  if ("correctionReasonRequired" in result) {
    return NextResponse.json(
      { error: "Indica un motivo de correccion de al menos 10 caracteres." },
      { status: 400 },
    );
  }

  if ("versionConflict" in result) {
    return NextResponse.json(
      { error: "El cierre cambio en otra sesion. Recarga antes de guardar." },
      { status: 409 },
    );
  }

  return NextResponse.json(result, { status: input.action === "publish" ? 201 : 200 });
}
