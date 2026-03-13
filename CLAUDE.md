# Claude Code Instructions

## Git & GitHub

- **Never commit to main directly**: Always create a branch, even for hotfixes — `git checkout -b fix/description`
- **No Claude attribution in commits**: Never add `Co-Authored-By: Claude` or any Claude/Anthropic attribution to commit messages or any documents.
- **Standard flow**: `git checkout -b feature-name` → commit → push → PR → merge → cleanup
- **PR workflow**: Use `gh pr create`, `gh pr merge`, `gh pr view` for PR operations
- **No PR template**: Create PRs with Summary + Test plan sections manually
- **Branch cleanup**: `gh pr merge <num> --squash --delete-branch` deletes remote automatically; then `git branch -d <name>` for local

## Code Quality

- **Pre-PR checks**: Run type checks, lint, and tests before creating PRs
- **Reproducible installs**: Use `npm ci` instead of `npm install` to match CI environment

## Worktrees

- **New worktree setup**: Copy `.env` from `app/` then run `cd app && npm run db:push -- --force` to initialize SQLite schema
- **Skip e2e tests in worktrees**: Only run `npm run check` and `npm run lint`; e2e tests require a running dev server + fresh DB
