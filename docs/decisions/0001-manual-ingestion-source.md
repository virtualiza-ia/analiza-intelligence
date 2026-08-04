# ADR 0001: Manual forms as a production data source

## Status

Accepted for the interim production phase.

## Decision

Monthly forms enter the same versioned ingestion boundary that future official connectors will use. PostgreSQL is the source of truth. Browser `localStorage` may render legacy DEMO history but must never acknowledge a productive save or publication.

The server boundary is `/api/manual-submissions`:

- `save` persists a draft;
- `publish` revalidates all required fields and requires quality score 70 or higher;
- `GET` returns at most 50 active versions filtered by branch, business line and period;
- branch access is derived from the authenticated account and database assignments;
- published versions are immutable;
- corrections create a higher version;
- every successful write creates an audit event.

When the form context selects a branch, business line and month, it requests that
exact server history and restores an existing draft. A server error never falls
back to browser storage for a productive write.

`GET /api/manual-submissions/readiness` verifies database reachability and the
three required tables without returning connection details. Deployment tooling
must treat HTTP 503 as a failed rollout.

## Data lineage

The canonical key is organization, branch, business line and month. Each version stores its validated answer payload, source type, quality score, actor and publication time. Later transformation jobs must reference the submission and version instead of reading browser state.

## Security

The API rejects unauthenticated users, read-only roles, out-of-scope branches, excessive fields, oversized values and field identifiers associated with patient/contact credentials. File contents are not accepted by this endpoint; attachments require a separate private-upload pipeline with server-side validation.

## Follow-up

- Add database integration tests against disposable PostgreSQL.
- Add attachment upload, validation and malware scanning.
- Publish normalized facts from approved versions.
- Replace legacy DEMO history reads after production backfill.
