# Analiza Intelligence Agent Rules

These rules apply to all work in this repository.

## Collaboration Protocol

- Treat GitHub issues, pull requests, and Git history as the source of truth. Do not coordinate through files that exist only on a VPS.
- Before editing, read `docs/WORKBOARD.md`, run `git status --short --branch`, and fetch the latest remote state when credentials are available.
- Work in a dedicated `codex/<owner>/<task>` branch and a separate Git worktree. Never let two active Codex sessions edit the same working directory.
- Add or claim one workboard row before implementation. Record the task, owner, branch, affected paths, and expected shared contracts.
- Do not edit paths claimed by another active task without coordinating through its issue or pull request first.
- Coordinate before changing shared contracts, authentication, authorization, KPI definitions, database schema, global routing, dependencies, or environment-variable contracts.
- Rebase the task branch on `origin/main` before handoff when safe. Use a merge instead if the branch is already shared.
- Deliver work through a small pull request. Direct pushes to `main` are not allowed.
- Never deploy an unmerged task branch to the production VPS.

## Engineering Baseline

- Use strict TypeScript.
- Do not use `any` without a written justification in the same change.
- Prefer existing project patterns before adding abstractions.
- Keep changes scoped to the active implementation phase.
- Create new migrations instead of modifying migrations that may have run.
- Document architectural decisions that affect security, data lineage, or KPI behavior.

## Security And Privacy

- Never expose secrets in source control, logs, screenshots, browser bundles, or documentation.
- Never store Supabase service role keys in browser code.
- Use server-only code for connector credentials and privileged Supabase operations.
- Do not use real patient data in development.
- Anonymize patient identifiers before analytics use.
- Avoid PII in logs, imports, exports, demo data, and support artifacts.
- Do not record passwords, tokens, cookies, MFA secrets, or connector secrets in audit logs.

## Data Integrity

- Mark all simulated data visibly as `DEMO`.
- Do not invent operational, financial, or clinical data.
- Do not show metrics when essential fields are missing.
- Keep traceability for each analytic record back to its source file, connector, import, and transformation.
- No executive insight may be presented as conclusive when data quality is insufficient.
- Do not mix `DEMO` data with real data in the same organization context.

## Imports And Connectors

- Validate files on the server.
- Restrict file size and extensions.
- Sanitize uploaded file names.
- Block dangerous spreadsheet formulas in generated exports.
- Prefer official APIs when available.
- Do not perform scraping that evades authentication, CAPTCHA, MFA, rate limits, or technical restrictions.
- Authorized scraping must use a valid user session, preserve audit logs, and fail closed when site structure changes.
- When credentials are unavailable, build a disabled real connector plus a `DEMO` adapter and document required credentials.

## Phase Validation

After every phase:

- Run lint.
- Run typecheck.
- Run tests.
- Run build.
- Fix errors before continuing.
- Review modified screens visually when the phase changes UI.
- Update documentation.
- Create a descriptive Git commit.
