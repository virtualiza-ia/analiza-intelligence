# Staging validation evidence — 2026-08-05

## Environment

- Host: existing Analiza VPS, isolated Docker Compose project
- Application binding: `127.0.0.1:3002`
- Compose project: `analiza-staging`
- PostgreSQL container: `analiza-staging-postgres-1`
- Application container: `analiza-staging-app-1`
- PostgreSQL volume: `analiza_staging_postgres_data`
- Synthetic credentials: stored only on the VPS with mode `600`
- Production application and PostgreSQL containers were not modified

The staging database uses a new password, database, Docker network and volume.
It contains only records marked as staging/DEMO. No production users, sessions,
invitations, passwords or operational records were copied.

## Evidence

| Check | Result |
| --- | --- |
| Fresh migrations, including local auth and manual ingestion | Passed |
| Manual ingestion RLS enabled | Passed |
| Readiness | HTTP 200, `ready: true` |
| Synthetic organizations | 2 |
| Synthetic accounts | 16, eight roles per organization |
| Super-admin login and history read | HTTP 200 |
| Viewer write attempt | HTTP 403 |
| Client quality score manipulation | Sent 1; server persisted 94 |
| Concurrent draft saves | One HTTP 200 and one HTTP 409 |
| Valid publication | HTTP 201 |
| Cross-tenant write | HTTP 403 |
| Tenant A read of tenant B branch | 0 records |
| Tenant B read of its branch | 1 record |
| Backup and restore rehearsal | Passed |
| Restored counts | 2 organizations, 16 users, 2 submissions |
| Production HTTPS during work | HTTP 200 |

Staging testing discovered and fixed two defects before release:

1. Aggregate fields such as `patients_total` were incorrectly rejected as PII.
2. PostgreSQL needed explicit UUID casts in the version insert statement.

An additional branch/company validation now rejects a business line that does
not match the branch company unit type.

## Backup and recovery

The staging backup is stored under
`/opt/analiza-intelligence-staging/shared/backups/` with mode `600`. It was
restored into the temporary database `analiza_staging_restore_test`, verified,
and the temporary database was dropped. The persistent staging database was not
replaced during the rehearsal.

## Remaining external action

`staging.analizabi.site` has no DNS record yet. The application remains bound to
loopback and is not publicly exposed. Add the DNS A record to the existing VPS,
then configure a dedicated Nginx virtual host and obtain a certificate before
browser acceptance testing. Do not expose port 3002 directly.

Production promotion also remains gated on merging the required pull requests
into `main`. Staging validation is not authorization to deploy an unmerged
branch to production.
