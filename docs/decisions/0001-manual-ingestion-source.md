# ADR 0001: Manual forms as a production data source

## Status

Accepted for the interim production phase.

## Decision

Monthly forms enter the same versioned ingestion boundary that future official connectors will use. PostgreSQL is the source of truth. Browser `localStorage` may render legacy DEMO history but must never acknowledge a productive save or publication.

The first server boundary is `POST /api/manual-submissions`:

- `save` persists a draft;
- `publish` revalidates all required fields and requires quality score 70 or higher;
- branch access is derived from the authenticated account and database assignments;
- published versions are immutable;
- corrections create a higher version;
- every successful write creates an audit event.

## Data lineage

The canonical key is organization, branch, business line and month. Each version stores its validated answer payload, source type, quality score, actor and publication time. Later transformation jobs must reference the submission and version instead of reading browser state.

## Security

The API rejects unauthenticated users, read-only roles, out-of-scope branches, excessive fields, oversized values and field identifiers associated with patient/contact credentials. File contents are not accepted by this endpoint; attachments require a separate private-upload pipeline with server-side validation.

## Follow-up

- Add authenticated GET endpoints for server-backed history and draft recovery.
- Add database integration tests against disposable PostgreSQL.
- Add attachment upload, validation and malware scanning.
- Publish normalized facts from approved versions.
- Replace legacy DEMO history reads after production backfill.
