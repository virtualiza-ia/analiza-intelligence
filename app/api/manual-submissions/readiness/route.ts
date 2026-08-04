import { NextResponse } from "next/server";

import { queryDatabase } from "@/lib/db/pool";

type ReadinessRow = {
  events_table: string | null;
  submissions_table: string | null;
  versions_table: string | null;
};

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ready: false, service: "manual-submissions" },
      { headers: noStoreHeaders, status: 503 },
    );
  }

  try {
    const result = await queryDatabase<ReadinessRow>(
      `select
         to_regclass('public.manual_monthly_submissions')::text as submissions_table,
         to_regclass('public.manual_monthly_submission_versions')::text as versions_table,
         to_regclass('public.manual_monthly_submission_events')::text as events_table`,
    );
    const row = result.rows[0];
    const ready = Boolean(
      row?.submissions_table && row.versions_table && row.events_table,
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
