import { NextResponse } from "next/server";

import { getCurrentAuthorizationActor } from "@/lib/server/authorization";
import { getMissingDatabaseConfig, getPostgresPool } from "@/lib/server/database";

type ProfilePayload = {
  displayName?: unknown;
  jobTitle?: unknown;
  phone?: unknown;
  photoUrl?: unknown;
  preferredName?: unknown;
};

type ProfileRow = {
  branch_name: string | null;
  company_name: string | null;
  country_name: string | null;
  display_name: string | null;
  email: string | null;
  job_title: string | null;
  operational_area_name: string | null;
  organization_name: string | null;
  phone: string | null;
  photo_url: string | null;
  preferred_name: string | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonError(error: string, status: number, missingConfig: string[] = []) {
  return NextResponse.json({ error, missingConfig, ok: false }, { status });
}

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function readPhotoUrl(value: unknown) {
  const photoUrl = readText(value, 500);

  if (!photoUrl) {
    return "";
  }

  try {
    const url = new URL(photoUrl);

    if (url.protocol !== "https:") {
      throw new Error("invalid protocol");
    }

    return url.toString();
  } catch {
    throw new Error("La foto debe ser una URL valida.");
  }
}

function toProfile(row: ProfileRow, actorRoleKey: string) {
  return {
    branchName: row.branch_name,
    companyName: row.company_name,
    countryName: row.country_name,
    displayName: row.display_name ?? "",
    email: row.email ?? "",
    jobTitle: row.job_title ?? "",
    operationalAreaName: row.operational_area_name,
    organizationName: row.organization_name,
    phone: row.phone ?? "",
    photoUrl: row.photo_url ?? "",
    preferredName: row.preferred_name ?? "",
    roleKey: actorRoleKey,
  };
}

async function readProfile(userId: string, roleKey: string) {
  const pool = getPostgresPool();
  const result = await pool.query<ProfileRow>(
    `
      select
        p.email,
        p.display_name,
        p.preferred_name,
        p.phone,
        p.job_title,
        p.photo_url,
        o.name as organization_name,
        c.name as country_name,
        co.name as company_name,
        oa.name as operational_area_name,
        b.name as branch_name
      from public.profiles p
      left join public.organizations o on o.id = p.organization_id
      left join public.countries c on c.id = p.default_country_id
      left join public.companies co on co.id = p.default_company_id
      left join public.branches b on b.id = p.default_branch_id
      left join public.operational_areas oa on oa.id = b.operational_area_id
      where p.id = $1
        and p.status = 'active'
        and p.deactivated_at is null
        and p.deleted_at is null
      limit 1
    `,
    [userId],
  );
  const row = result.rows[0];

  return row ? toProfile(row, roleKey) : null;
}

export async function GET() {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Sesion no autorizada.", 401);
  }

  if (!uuidPattern.test(actor.userId)) {
    return NextResponse.json({
      editable: false,
      ok: true,
      profile: {
        branchName: actor.scope.branchId,
        companyName: actor.scope.companyId,
        countryName: actor.scope.countryId,
        displayName: actor.email,
        email: actor.email,
        jobTitle: "",
        operationalAreaName: actor.scope.operationalAreaId,
        organizationName: actor.scope.organizationId,
        phone: "",
        photoUrl: "",
        preferredName: "",
        roleKey: actor.roleKey,
      },
    });
  }

  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    return jsonError("La base de datos no esta configurada.", 503, missingConfig);
  }

  const profile = await readProfile(actor.userId, actor.roleKey);

  if (!profile) {
    return jsonError("Perfil no encontrado.", 404);
  }

  return NextResponse.json({ editable: true, ok: true, profile });
}

export async function PUT(request: Request) {
  const actor = await getCurrentAuthorizationActor();

  if (!actor) {
    return jsonError("Sesion no autorizada.", 401);
  }

  if (!uuidPattern.test(actor.userId)) {
    return jsonError("Este perfil no es editable en modo DEMO.", 403);
  }

  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    return jsonError("La base de datos no esta configurada.", 503, missingConfig);
  }

  const payload = (await request.json().catch(() => null)) as
    | ProfilePayload
    | null;
  const displayName = readText(payload?.displayName, 120);
  const preferredName = readText(payload?.preferredName, 80);
  const phone = readText(payload?.phone, 40);
  const jobTitle = readText(payload?.jobTitle, 120);
  let photoUrl = "";

  try {
    photoUrl = readPhotoUrl(payload?.photoUrl);
  } catch (error: unknown) {
    return jsonError(
      error instanceof Error ? error.message : "La foto debe ser una URL valida.",
      400,
    );
  }

  if (!displayName) {
    return jsonError("El nombre completo es obligatorio.", 400);
  }

  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(
      `
        update public.profiles
        set display_name = $1,
            preferred_name = nullif($2, ''),
            phone = nullif($3, ''),
            job_title = nullif($4, ''),
            photo_url = nullif($5, ''),
            updated_at = now()
        where id = $6
          and status = 'active'
          and deactivated_at is null
          and deleted_at is null
      `,
      [displayName, preferredName, phone, jobTitle, photoUrl, actor.userId],
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
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        actor.scope.organizationId,
        actor.userId,
        "account_profile.updated",
        "profiles",
        actor.userId,
        actor.scope.countryId,
        actor.scope.companyId,
        actor.scope.branchId,
        JSON.stringify({
          fields: [
            "display_name",
            "preferred_name",
            "phone",
            "job_title",
            "photo_url",
          ],
          source: "mi-cuenta",
        }),
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const profile = await readProfile(actor.userId, actor.roleKey);

  return NextResponse.json({ editable: true, ok: true, profile });
}
