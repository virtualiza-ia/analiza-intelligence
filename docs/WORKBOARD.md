# Workboard

This board prevents overlapping work while GitHub issues and pull requests remain the durable source of truth.

## Rules

1. Create or reference a GitHub issue before implementation.
2. Claim a row and list the paths or contracts likely to change.
3. Use one branch and one worktree per active task.
4. Coordinate in the issue before touching another active task's paths.
5. Remove the active claim after the pull request is merged; completed work remains discoverable through Git history and the pull request.

## Active work

| Issue | Task | Owner | Branch | Claimed paths or contracts | Status |
| --- | --- | --- | --- | --- | --- |
| — | Repository collaboration controls | Primary Codex | `codex/primary/collaboration-controls` | `AGENTS.md`, `.github/`, `docs/WORKBOARD.md`, `docs/collaboration-workflow.md` | In review |
| [#1](https://github.com/virtualiza-ia/analiza-intelligence/issues/1) | PostgreSQL authentication, RBAC, and secure user lifecycle | Codex Alberto | `codex/alberto/auth-rbac` | `app/auth/`, `app/api/users/`, `app/protected/`, authentication, user-management and navigation components, `lib/auth/`, `lib/db/`, server-only mail and user-lifecycle services, `lib/navigation.ts`, `proxy.ts`, `supabase/migrations/`, dependency and environment contracts, auth documentation and tests | In progress |

Allowed statuses: `Planned`, `In progress`, `Blocked`, `In review`.

## Collision-sensitive areas

Coordinate explicitly before changing any of these:

- `supabase/migrations/` and database contracts
- authentication, authorization, tenant isolation, or roles
- KPI definitions and data-quality behavior
- `package.json` or `package-lock.json`
- global application routing, navigation, or shared layout
- environment-variable names and deployment configuration
