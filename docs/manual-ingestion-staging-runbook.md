# Manual ingestion staging runbook

Use this runbook before promoting manual monthly ingestion to production. Never
run these steps against production from an unmerged branch.

## 1. Preconditions

- The pull request is merged into `main` and all quality checks pass.
- Staging uses a separate PostgreSQL database and contains no real patient data.
- `DATABASE_URL` is stored only in the deployment secret manager or the VPS
  `.env.docker`; it is never committed or pasted into logs.
- A staging organization, company, branch, active profile and role assignment
  have been provisioned.

## 2. Database backup and migration

Create a recoverable staging backup using the database provider controls. Then
apply all migrations in timestamp order through the approved migration runner.
The manual-ingestion migration is:

```text
supabase/migrations/20260804000200_manual_monthly_submissions.sql
```

Do not edit an already-applied migration. Corrections require a new migration.

## 3. Deploy and verify readiness

Deploy the merged `main` image to staging and check:

```bash
curl --fail --silent --show-error \
  https://STAGING_HOST/api/manual-submissions/readiness
```

Expected response:

```json
{"ready":true,"service":"manual-submissions"}
```

HTTP `503` means `DATABASE_URL` is missing, PostgreSQL is unreachable, or one
of the three required manual-ingestion tables has not been created, RLS is not
enabled, or the server connection role cannot write while RLS is active. The
server role must own the tables or have an approved `BYPASSRLS` role; browser
roles retain read-only scoped policies. The endpoint does not return database
names, role names, connection errors or credentials.

## 4. Role-based acceptance test

Use synthetic values visibly identified as staging data:

1. Sign in as an authorized branch user.
2. Select an assigned branch, business line and month.
3. Save a draft and reload the page; confirm the draft is restored.
4. Try publishing with missing required fields; confirm it is rejected.
5. Complete the fields with quality below 70; confirm publication is rejected.
6. Publish a valid closure and confirm its version and audit event in PostgreSQL.
7. Sign in as a user from another branch; confirm the closure is not returned.
8. Sign in as `viewer`; confirm writes return HTTP `403`.
9. Confirm no patient identifiers, credentials or real operational values were
   entered or logged.

## 5. Promotion and rollback

Promote only the exact image digest validated in staging. After production
deployment, repeat the readiness check before routing users to the service.

If readiness or the acceptance test fails:

1. Stop the rollout and keep the prior application image active.
2. Do not delete or mutate captured submissions manually.
3. Restore the database only when the migration itself caused the failure and
   the approved recovery procedure requires it.
4. Record the failure in the GitHub issue or pull request with sanitized logs.
5. Fix forward with a new migration or application commit.
