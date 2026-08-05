import { NextResponse } from "next/server";

import {
  getDatabaseUrl,
  getMissingDatabaseConfig,
  getPostgresPool,
} from "@/lib/server/database";

type ReadinessRow = {
  events_table: string | null;
  events_rls: boolean;
  submissions_table: string | null;
  submissions_rls: boolean;
  server_can_write: boolean;
  versions_table: string | null;
  versions_rls: boolean;
};

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  if (!getDatabaseUrl() && getMissingDatabaseConfig().length > 0) {
    return NextResponse.json(
      { ready: false, service: "manual-submissions" },
      { headers: noStoreHeaders, status: 503 },
    );
  }

  try {
    const result = await getPostgresPool().query<ReadinessRow>(
      `select
         to_regclass('public.manual_monthly_submissions')::text as submissions_table,
         to_regclass('public.manual_monthly_submission_versions')::text as versions_table,
         to_regclass('public.manual_monthly_submission_events')::text as events_table,
         coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.manual_monthly_submissions')), false) as submissions_rls,
         coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.manual_monthly_submission_versions')), false) as versions_rls,
         coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.manual_monthly_submission_events')), false) as events_rls,
         has_table_privilege(current_user, 'public.manual_monthly_submissions', 'INSERT,UPDATE')
           and exists (
             select 1
             from pg_roles role
             join pg_class relation on relation.oid = to_regclass('public.manual_monthly_submissions')
             where role.rolname = current_user
               and (role.rolbypassrls or relation.relowner = role.oid)
           ) as server_can_write`,
    );
    const row = result.rows[0];
    const ready = Boolean(
      row?.submissions_table &&
        row.versions_table &&
        row.events_table &&
        row.submissions_rls &&
        row.versions_rls &&
        row.events_rls &&
        row.server_can_write,
    );

    return NextResponse.json(
      { ready, service: "manual-submissions" },
      { headers: noStoreHeaders, status: ready ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      { ready: false, service: "manual-submissions" },
      { headers: noStoreHeaders, status: 503 },
    );
  }
}
