# Consolidated Integration Base

Date: 2026-08-05

## Decision

`codex/alberto/integracion-final` uses `codex/invitation-password-auth` as the
functional source of truth for authentication, sessions, RBAC, invitations and
branch scope. PR #2 is retained in Git ancestry for traceability, but its
parallel authentication implementation is superseded and is not activated.

PR #3 is also retained in ancestry. Its productive manual-ingestion commits
were applied selectively on top of the functional base: versioned submissions,
draft recovery, productive/DEMO separation, server-side validation, readiness,
RLS, staging validation and HTTPS staging configuration.

The manual-submission API uses the existing signed local session and shared
PostgreSQL pool from the functional base. It does not introduce a second cookie,
session table or connection pool.

## Security and data-lineage consequences

- Authorization remains server-side and branch-scoped.
- Corrections to published closures require an authorized administrator and a
  recorded reason; the obsolete form authorization-code field is not restored.
- Productive submissions and DEMO history remain separate.
- Submission versions and replacement events preserve audit lineage.
- No production deployment is authorized by this integration.

## Follow-up development

New correction branches must start from `codex/alberto/integracion-final` until
the integration PR is reviewed and merged. Auth, RBAC, invitations, database
contracts and manual-submission rules remain collision-sensitive areas.
