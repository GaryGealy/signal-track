# cut-a-release Skill Design

**Date:** 2026-02-26
**Status:** Approved

## Overview

A repo-specific Claude Code skill that automates the full release workflow when the user says "cut a release". The skill lives in `.claude/skills/cut-a-release/SKILL.md` and is inherited by all projects forked from this template.

## Structure

Single `SKILL.md` with four clearly labeled phases. After PR creation the skill pauses and waits for the user to say "merged" before proceeding to tag and publish the release.

## Phase 1 — Analysis

1. `git checkout main && git pull` to ensure we're on latest main
2. Find most recent tag via `git tag --sort=-v:refname | head -1`; if none exists, treat prior version as `0.0.0`
3. Get all commits since last tag via `git log <tag>..HEAD`
4. Determine semver bump recommendation:
   - **Major**: breaking changes (commit messages containing `BREAKING CHANGE`, API removals)
   - **Minor**: new features (`feat:` prefix or additive changes)
   - **Patch**: bug fixes, docs, chores, dependency updates
5. Scan for `*.sql` files changed since last tag — flag as DB migration warning
6. Flag other high-risk changes: config file changes, dependency major bumps, auth/security-related files

## Phase 2 — Confirmation

Present a summary to the user:
- Current version → proposed new version + reasoning
- Grouped list of changes (Added / Changed / Fixed / etc.)
- DB migration warning if any `*.sql` files found
- Other high-risk items called out explicitly

Ask the user to confirm the version bump type or adjust it before proceeding.

## Phase 3 — Release Prep

1. Generate a `CHANGELOG.md` entry in Keep a Changelog format (https://keepachangelog.com/en/1.0.0/); create the file if it doesn't exist
2. Bump version in `package.json` and `package-lock.json` directly (not via `npm version` to avoid an unwanted tag)
3. Create branch `release/vX.Y.Z`
4. Commit: `chore: release vX.Y.Z`
5. Create PR:
   - Title: `Release vX.Y.Z`
   - Body: anchor link to the new changelog section on the release branch, e.g. `https://github.com/<owner>/<repo>/blob/release/vX.Y.Z/CHANGELOG.md#xyz---yyyy-mm-dd`
6. Print PR URL and pause — instruct user to merge and say "merged" to continue

## Phase 4 — Post-merge Finalization

After user says "merged":
1. Fetch merge commit SHA via `gh pr view <number> --json mergeCommit`
2. Create annotated tag on merge commit: `git tag -a vX.Y.Z <sha> -m "Release vX.Y.Z"`
3. Push tag: `git push origin vX.Y.Z`
4. Create GH release: `gh release create vX.Y.Z --title "vX.Y.Z" --notes-file <changelog-entry>` — triggers the deploy pipeline

## File Location

```
.claude/skills/cut-a-release/SKILL.md
```

## Changelog Anchor Format

GitHub generates anchors by stripping `[`, `]`, `.` and replacing spaces with `-`.
For `## [1.2.3] - 2026-02-26` the anchor is `#123---2026-02-26`.
