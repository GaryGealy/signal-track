---
description: Start work on a GitHub issue with automatic setup and routing
args:
  issue_number:
    description: GitHub issue number to work on
    required: true
  base_branch:
    description: Base branch to start from (defaults to main if not specified)
    required: false
---

# Work on GitHub Issue

You are helping the user start work on GitHub Issue #{issue_number}. Follow this workflow carefully:

## Step 1: Determine Base Branch

**Default behavior:** Branch from `main` unless the user specifies a different base branch.

If the user provided a `base_branch` argument when invoking the command, use that branch.

If no `base_branch` was provided, default to `main`.

Only ask the user if there's ambiguity or if you need clarification about which branch to use.

## Step 2: Fetch Issue Details

Use the GitHub MCP tool to fetch the complete issue details:
- Issue title
- Issue body/description
- Labels
- Comments
- Current state

Display the issue information clearly to the user.

## Step 3: Analyze Issue Complexity

Based on the issue details, determine:

**Simple Issue** (can implement directly):
- UI text changes
- Simple styling updates
- Minor configuration changes
- Documentation updates
- Bug fixes with clear solution

**Complex Issue** (needs planning):
- New features
- Architecture changes
- Database schema changes
- Integration with external services
- Multiple file changes
- Requires research or design decisions

## Step 4: Create Branch

First, ensure you're on the base branch determined in Step 1 (typically `main`):
```bash
git checkout {base_branch}
git pull origin {base_branch}
```

Then create a new branch using this naming convention:
- `fix/{issue_number}-{slug}` for bug fixes
- `feat/{issue_number}-{slug}` for features
- `docs/{issue_number}-{slug}` for documentation
- `refactor/{issue_number}-{slug}` for refactoring

The slug should be a short, kebab-case version of the issue title (2-4 words max).

## Step 5: Create Task List

Use TaskCreate to create tasks for:
1. Understanding/research (if complex)
2. Implementation
3. Testing
4. Create PR
5. Merge to main

Mark the first task as in_progress.

## Step 6: Comment on Issue

Use the GitHub MCP tool to add a comment to the issue:

```
🤖 **Work Started**

Claude Code has started work on this issue.

**Branch:** [branch-name]
**Complexity:** [Simple/Complex]
**Approach:** [Brief description of planned approach]

---
_Automated by Claude Code_
```

## Step 7: Route Based on Complexity

**For Simple Issues:**
- Proceed directly with implementation
- Read relevant files
- Make the changes
- Update task list as you progress

**For Complex Issues:**
- Recommend using `/brainstorming` skill first
- Or suggest creating an implementation plan
- Ask user how they want to proceed

## Step 8: Ready to Work

Inform the user:
- ✅ Branch created and checked out
- ✅ Task list created
- ✅ Issue commented
- ✅ Ready to start work

Then ask: "Would you like me to start implementing now, or would you like to provide additional context first?"

---

## Important Notes

- **Default base branch is `main`** - Only ask user about base branch if they specify one in args or if clarification is needed
- Always fetch fresh issue data from GitHub
- Check if a branch for this issue already exists before creating
- If the issue is already closed, ask the user if they want to reopen it
- If the issue is assigned to someone else, warn the user
- Create meaningful, actionable tasks in the task list
- Be conservative in complexity assessment - when in doubt, treat as complex

## Usage Examples

```bash
# Default - branches from main
/issue 123

# Specify a different base branch
/issue 123 cloudflare

# Or using named argument
/issue issue_number=123 base_branch=cloudflare
```
