# cut-a-release Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a `.claude/skills/cut-a-release/SKILL.md` that automates the full release workflow when the user says "cut a release".

**Architecture:** A single markdown skill file with four explicit phases: analysis, user confirmation, release prep (changelog + version bump + PR), and post-merge finalization (tag + GH release). The skill pauses between Phase 3 and Phase 4 waiting for the user to say "merged".

**Tech Stack:** git, gh CLI, package.json / package-lock.json, Keep a Changelog format, GitHub Releases

---

### Task 1: Create the skill file

**Files:**
- Create: `.claude/skills/cut-a-release/SKILL.md`

**Step 1: Create the directory**

```bash
mkdir -p .claude/skills/cut-a-release
```

**Step 2: Write the skill file**

Create `.claude/skills/cut-a-release/SKILL.md` with the exact content below:

````markdown
---
name: cut-a-release
description: >
  Use when the user says "cut a release". Automates the full release workflow:
  analysis, changelog generation, version bump, PR creation, and post-merge
  tagging and GitHub release publication.
---

# Cut a Release

## Overview

This skill guides you through the full release workflow in four phases.
Complete each phase fully before moving to the next. Do not skip or combine steps.

---

## Phase 1: Analysis

**Step 1.1 — Get latest main**
```bash
git checkout main
git pull origin main
```

**Step 1.2 — Find the last release tag**
```bash
git tag --sort=-v:refname | head -1
```
If no tags exist, use `0.0.0` as the baseline and treat all commits as new.

**Step 1.3 — Gather commits since last tag**
```bash
# If tags exist:
git log <LAST_TAG>..HEAD --oneline

# If no tags:
git log --oneline
```

**Step 1.4 — Get changed files since last tag**
```bash
# If tags exist:
git diff <LAST_TAG>..HEAD --name-only

# If no tags:
git diff --name-only $(git rev-list --max-parents=0 HEAD) HEAD
```

**Step 1.5 — Check for database migrations**
Scan the changed file list for any `*.sql` files. Note each one found.

**Step 1.6 — Identify high-risk changes**
Flag any of the following in the changed file list or commit messages:
- `*.sql` files (DB migrations)
- `package.json` (check if any dependency received a major version bump)
- Files in paths containing `auth`, `security`, `credentials`
- Files named `*.config.*` or `.env*`
- Commit messages containing `BREAKING CHANGE`

**Step 1.7 — Determine semver bump**
Read current version from `package.json` `"version"` field.

Apply in order (first match wins):
- **Major** — any commit contains `BREAKING CHANGE`, or a public API is removed/incompatibly changed
- **Minor** — any commit adds a new feature (`feat:` prefix, or clearly additive change)
- **Patch** — all commits are bug fixes, docs, chores, refactors, or dependency updates

---

## Phase 2: Confirmation

Present this summary to the user before taking any action:

```
Current version: X.Y.Z
Proposed version: A.B.C [patch|minor|major]

Reason: [explain why this bump type was chosen based on the commits]

Changes since vX.Y.Z:
  Added:
    - ...
  Changed:
    - ...
  Fixed:
    - ...
  (only include sections with entries)

⚠️  DB Migrations detected:
    - path/to/migration.sql
    (These will run on next deploy — ensure they are backwards-compatible)

⚠️  High-risk changes:
    - ...
```

Ask:
> Does this look right? Confirm the version bump, or say "make it minor/major/patch" to adjust.

**Wait for explicit confirmation before proceeding.**

---

## Phase 3: Release Prep

Use the confirmed version for all steps. Refer to it as `vX.Y.Z` (e.g. `v1.2.3`).

**Step 3.1 — Create release branch**
```bash
git checkout -b release/vX.Y.Z
```

**Step 3.2 — Update CHANGELOG.md**

If `CHANGELOG.md` does not exist, create it with this header first:
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
```

Prepend the new release section immediately after the `## [Unreleased]` line
(or at the top of the file if no Unreleased section exists):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...
```

Only include sections (Added / Changed / Deprecated / Removed / Fixed / Security)
that have at least one entry. Use today's date for `YYYY-MM-DD`.

Add or update the comparison links at the bottom of the file:
```markdown
[Unreleased]: https://github.com/OWNER/REPO/compare/vX.Y.Z...HEAD
[X.Y.Z]: https://github.com/OWNER/REPO/compare/vPREV...vX.Y.Z
```

Get owner/repo with:
```bash
gh repo view --json nameWithOwner --jq .nameWithOwner
```

**Step 3.3 — Bump version in package.json**

Edit `package.json`: change `"version": "OLD_VERSION"` to `"version": "X.Y.Z"`.

**Step 3.4 — Bump version in package-lock.json**

Edit `package-lock.json`: change the top-level `"version"` field to `"X.Y.Z"`.
Also update `packages[""].version` if that field exists.

**Step 3.5 — Commit and push**
```bash
git add CHANGELOG.md package.json package-lock.json
git commit -m "chore: release vX.Y.Z"
git push origin release/vX.Y.Z
```

**Step 3.6 — Compute the changelog anchor**

GitHub generates heading anchors by:
1. Lowercasing the heading text
2. Removing characters that are not letters, numbers, spaces, or hyphens
3. Replacing spaces with hyphens

For `## [X.Y.Z] - YYYY-MM-DD`:
- Strip `[`, `]`, `.` → `XYZ - YYYY-MM-DD`
- Lowercase → `xyz - yyyy-mm-dd`
- Replace spaces with `-` → `xyz---yyyy-mm-dd`
- Result anchor: `#xyz---yyyy-mm-dd`

**Step 3.7 — Create PR**
```bash
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
# substitute the computed anchor below:
CHANGELOG_URL="https://github.com/${REPO}/blob/release/vX.Y.Z/CHANGELOG.md#xyz---yyyy-mm-dd"

gh pr create \
  --title "Release vX.Y.Z" \
  --body "${CHANGELOG_URL}" \
  --base main \
  --head release/vX.Y.Z
```

Print the PR URL, then say:

> PR created: [url]
>
> Merge the PR when ready, then tell me **"merged"** to continue.

**Wait for the user to say "merged" before proceeding to Phase 4.**

---

## Phase 4: Post-merge Finalization

**Step 4.1 — Get the merge commit SHA**

You should have the PR number from Phase 3. If not, retrieve it:
```bash
gh pr list --state merged --head release/vX.Y.Z --json number --jq '.[0].number'
```

Then get the merge commit:
```bash
gh pr view <PR_NUMBER> --json mergeCommit --jq '.mergeCommit.oid'
```

**Step 4.2 — Fetch latest from origin**
```bash
git fetch origin main
```

**Step 4.3 — Tag the merge commit**
```bash
git tag -a vX.Y.Z <MERGE_SHA> -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

**Step 4.4 — Extract changelog notes**

Read the `## [X.Y.Z]` section from the merged `CHANGELOG.md` on main
(all lines from that header up to but not including the next `##` header).
Save to `/tmp/release-notes-vX.Y.Z.md`.

```bash
git show origin/main:CHANGELOG.md | \
  awk '/^## \[X\.Y\.Z\]/{found=1; next} found && /^## /{exit} found{print}' \
  > /tmp/release-notes-vX.Y.Z.md
```

(Substitute the literal version string for `X\.Y\.Z` in the awk pattern.)

**Step 4.5 — Create GitHub release**
```bash
gh release create vX.Y.Z \
  --title "vX.Y.Z" \
  --notes-file /tmp/release-notes-vX.Y.Z.md
```

This triggers the deploy pipeline via the `release: published` workflow trigger.

Confirm to the user:
```
✓ Release vX.Y.Z published. Deploy pipeline triggered.

  Tag:     vX.Y.Z
  Release: https://github.com/OWNER/REPO/releases/tag/vX.Y.Z
```
````

**Step 3: Verify the file exists and is well-formed**

```bash
cat .claude/skills/cut-a-release/SKILL.md | head -20
```

Expected: YAML frontmatter with `name: cut-a-release` followed by the skill content.

**Step 4: Commit**

```bash
git add .claude/skills/cut-a-release/SKILL.md
git commit -m "feat: add cut-a-release skill"
```

---

### Task 2: Smoke test the skill

There is no automated test for a skill file — verification is done by manual inspection.

**Step 1: Check frontmatter is valid YAML**

The file must start with `---` and contain `name:` and `description:` fields before the closing `---`.

**Step 2: Check all four phases are present**

```bash
grep -n "^## Phase" .claude/skills/cut-a-release/SKILL.md
```

Expected output:
```
## Phase 1: Analysis
## Phase 2: Confirmation
## Phase 3: Release Prep
## Phase 4: Post-merge Finalization
```

**Step 3: Check all bash commands are fenced**

Visually confirm every shell command block uses ` ```bash ` fencing.

**Step 4: Confirm pause points**

Grep for the two explicit wait instructions:
```bash
grep -n "Wait for" .claude/skills/cut-a-release/SKILL.md
```

Expected: two matches — one after Phase 2 confirmation, one after PR creation.
