# Local PostgreSQL user lifecycle

## Decision

Analiza Intelligence uses PostgreSQL-backed identities, password accounts,
sessions, invitations, roles, and delegated scope. Supabase password recovery
and browser-controlled DEMO roles are not part of the production flow.

## Security properties

- Actor identity, role, organization, and scope come from the server session.
- Invitation and recovery tokens contain 32 random bytes and only SHA-256
  hashes are persisted.
- Invitation acceptance is transactional across identity, profile, password,
  role, scope, and invitation status.
- Password hashes use bcrypt with cost 12.
- Password recovery revokes all active sessions.
- SMTP credentials remain server-only.
- Delivery failure is recorded without logging credentials or raw tokens.

## Operational consequence

Production requires `DATABASE_URL`, `APP_URL`, and all `SMTP_*` variables. A
release must apply timestamped migrations before starting the application and
must verify SMTP authentication and the complete invitation flow after deploy.
