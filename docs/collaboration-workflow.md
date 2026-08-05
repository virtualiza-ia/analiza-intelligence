# Collaboration workflow

Git and GitHub are the source of truth. The VPS is a deployment target, not a shared development directory or coordination database.

## One-time repository setup

The repository administrator should protect `main` in GitHub with these rules:

- require a pull request before merging;
- require at least one approval;
- require the `Quality / lint, typecheck, test, and build` check;
- require conversations to be resolved;
- block force pushes and deletion;
- prefer squash merge for a compact history.

Add both collaborators as repository members. Update `.github/CODEOWNERS` with their actual GitHub usernames before making owner approval mandatory.

## Start a task

From a clean primary checkout:

```bash
git fetch origin
git worktree add ../analiza-<owner>-<task> -b codex/<owner>/<task> origin/main
cd ../analiza-<owner>-<task>
```

If `origin/main` does not exist yet, an administrator must first create and push the initial project commit. Do not build parallel branches from unrelated root commits.

In the task worktree:

1. Read `AGENTS.md` and `docs/WORKBOARD.md`.
2. Run `git status --short --branch`.
3. Add a workboard claim with the issue, owner, branch, and affected paths.
4. Commit and push that claim before substantial implementation.
5. Stop and coordinate in the issue if an active claim overlaps.

## Implement and validate

Keep commits scoped to the task. Do not include unrelated changes already present in a worktree.

Run the required checks after every implementation phase:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Visually review modified screens and include evidence in the pull request when UI changes.

## Synchronize and hand off

For a private task branch:

```bash
git fetch origin
git rebase origin/main
npm run lint
npm run typecheck
npm test
npm run build
git push --force-with-lease origin codex/<owner>/<task>
```

If another person is also using the same task branch, merge `origin/main` instead of rebasing and never force-push it.

Open a small pull request using the repository template. After approval and successful CI, squash-merge it. Then remove the worktree:

```bash
git worktree remove ../analiza-<owner>-<task>
git worktree prune
```

## Database and shared-contract changes

- Create a new timestamped migration; never modify a migration that may have run.
- Assign one task as owner of a shared contract change.
- Merge the shared contract first, then rebase dependent tasks.
- Document decisions affecting security, lineage, or KPI behavior under `docs/decisions/`.
- Do not place credentials, patient data, tokens, cookies, or production exports in issues, commits, screenshots, logs, or pull requests.
