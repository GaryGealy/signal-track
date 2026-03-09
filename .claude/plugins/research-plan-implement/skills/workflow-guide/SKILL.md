---
name: workflow-guide
description: Learn how to use the Research → Plan → Implement workflow effectively through intentional compaction
---

# Research → Plan → Implement Workflow Guide

Interactive guide to understanding and using the RPI (Research, Plan, Implement) workflow effectively.

## How to Use This Guide

You can:
- Run `/workflow-guide` to see the full guide
- Run `/workflow-guide [topic]` to learn about a specific area

**Available topics:**
- `overview` - What is intentional compaction and the RPI workflow?
- `research` - How to use the research phase effectively
- `plan` - How to create good implementation plans
- `implement` - How to execute plans successfully
- `context` - Managing context windows and compaction
- `patterns` - Common workflow patterns (greenfield, bug fix, refactoring)
- `tips` - Best practices and common pitfalls
- `examples` - Real-world success stories

## Quick Start

If no topic specified, show this quick start guide:

---

# Research → Plan → Implement Workflow

This workflow uses **intentional compaction** to manage AI agent context windows effectively.

## What is Intentional Compaction?

Intentional compaction is a deliberate strategy where you periodically pause work and distill progress into structured artifacts (research summaries, plans, status updates) before starting fresh context windows.

**Why it matters:** Since LLMs are stateless functions, your context window is the ONLY lever you have to affect output quality without retraining models.

## The Three-Phase Workflow

### 🔍 Phase 1: Research (`/research-codebase`)

**Purpose:** Explore and understand the codebase without polluting your main context.

**Example:**
```bash
/research-codebase "How does user authentication work?"
```

**What happens:**
- Spawns parallel sub-agents to explore
- Sub-agents search files, trace data flow, find patterns
- Output: Clean research document with findings
- Main agent never sees messy file discovery

**Output:** `thoughts/shared/research/YYYY-MM-DD-topic.md`

### 📋 Phase 2: Plan (`/create-plan`)

**Purpose:** Create exact implementation specification based on research.

**Example:**
```bash
/create-plan thoughts/tickets/add-oauth-support.md
```

**What happens:**
- Reads research documents and requirements
- Asks clarifying questions
- Proposes implementation phases
- Creates detailed plan with success criteria

**Output:** `thoughts/shared/plans/YYYY-MM-DD-topic.md`

**Critical insight:** A bad line in a plan can lead to hundreds of bad lines of code. Review carefully!

### ⚙️ Phase 3: Implement (`/implement-plan`)

**Purpose:** Execute the plan with verification checkpoints.

**Example:**
```bash
/implement-plan thoughts/shared/plans/2025-01-05-oauth-support.md
```

**What happens:**
- Reads plan completely
- Implements one phase at a time
- Runs automated verification (tests, linting, builds)
- Pauses for manual testing between phases
- Updates checkboxes in plan

## Strategic Human Review Points

Focus your effort on the **highest-leverage checkpoints**:

| Phase | Your Role | Impact |
|-------|-----------|--------|
| Research | Validate findings are accurate/complete | Prevents cascading errors |
| Planning | Review implementation approach | Bad plan → hundreds of bad lines |
| Implementation | Manual testing between phases | Catch issues before they compound |

## Context Window Management

**Optimization Hierarchy** (prioritize by worst outcomes):
1. ❌ Incorrect information (most damaging)
2. ⚠️ Missing information
3. 📊 Excessive noise

**Target:** Keep context utilization at 40-60%
- Lower utilization preserves capacity for course corrections
- Avoid maxing out context—leaves no room for debugging

## Real-World Results

- **300k LOC Rust codebase:** 1-hour bug fix by non-expert, PR approved without revision
- **35k LOC feature:** 7 hours vs 3-5 days estimated, minimal PR revisions
- **Key factor:** Upfront research investment pays off

## Quick Tips

✓ Always research before planning (even for "simple" tasks)
✓ Review and validate plans before implementing
✓ Implement one phase at a time, verify between phases
✓ Keep context utilization under 70%
✓ Compact progress into documents, start fresh contexts

## Learn More

Run `/workflow-guide [topic]` for detailed information:
- `/workflow-guide research` - Deep dive on research phase
- `/workflow-guide plan` - Planning best practices
- `/workflow-guide implement` - Implementation patterns
- `/workflow-guide context` - Context window optimization
- `/workflow-guide patterns` - Common workflow patterns
- `/workflow-guide tips` - Best practices and pitfalls

---

## Topic-Specific Content

When user specifies a topic, provide detailed content for that area:

### Topic: `overview`

Show the quick start content above plus:

**What Gets Compacted:**
- File search results
- Code flow understanding
- Build/test logs
- Tool output (JSON blobs)
- Error states and debugging attempts
- Research findings
- Implementation progress

**Compaction Output Format:**
```markdown
# [Topic] Research/Plan/Status

## Problem Statement
[What we're trying to solve]

## Investigation Findings
[What we discovered]

## Current Status
[Where we are now]

## Next Steps
[What to do next]

## Critical Dependencies
[Important constraints or relationships]
```

### Topic: `research`

**Research Phase Deep Dive**

**Purpose:** Thoroughly explore the codebase before making any implementation decisions.

**When to research:**
- Before starting any new feature
- Before fixing complex bugs
- Before refactoring
- When you don't understand how something works
- Even for "simple" tasks (prevents assumptions)

**What good research looks like:**
✓ Specific file paths with line numbers
✓ Explanation of data flow
✓ Identification of existing patterns
✓ Examples of similar implementations
✓ Notes on conventions and standards
✓ Edge cases and gotchas discovered

**What bad research looks like:**
❌ Vague descriptions without file references
❌ Assumptions instead of verified facts
❌ Missing edge cases or error handling
❌ No examples of existing patterns
❌ Surface-level understanding

**Best practices:**
- Be specific in your research question
- Review the research document before planning
- Ask follow-up questions if unclear
- Validate findings match your understanding
- Look for multiple examples of patterns

**Example research questions:**
- "How does user authentication work in this codebase?"
- "Where are API endpoints defined and what patterns do they follow?"
- "How is error handling done in the payment processing module?"
- "What testing patterns exist for database migrations?"

### Topic: `plan`

**Planning Phase Deep Dive**

**Purpose:** Create a detailed, unambiguous specification that guides implementation.

**What makes a good plan:**
✓ Specific file paths and line numbers
✓ Code examples showing the pattern
✓ Clear success criteria (automated + manual)
✓ Incremental phases (3-5 phases max per plan)
✓ Each phase is independently testable
✓ Database migrations clearly specified
✓ No open questions or "TBD" items

**What makes a bad plan:**
❌ Vague instructions like "implement feature X"
❌ No specific file references
❌ Unclear when "done"
❌ All-or-nothing (no phases)
❌ Missing test strategy
❌ Unresolved questions

**Planning workflow:**
1. Start with high-level approach
2. Get user alignment on approach
3. Break into phases
4. Detail each phase with specifics
5. Define success criteria
6. Get final approval

**Success Criteria Format:**
```markdown
### Success Criteria

#### Automated Verification:
- [ ] All tests pass: npm run test:unit
- [ ] No linting errors: npm run lint
- [ ] Type checking passes: npm run check
- [ ] Build succeeds: npm run build

#### Manual Verification:
- [ ] Feature works in UI as expected
- [ ] Performance acceptable with 1000+ items
- [ ] Error messages are user-friendly
- [ ] Works on mobile devices
```

**Critical:** Separate automated (can run automatically) from manual (requires human testing).

### Topic: `implement`

**Implementation Phase Deep Dive**

**Purpose:** Execute the plan systematically with verification at each step.

**Implementation workflow:**
1. Read entire plan first (don't skip ahead)
2. Implement Phase 1 completely
3. Run all automated verification
4. Pause for manual testing
5. Get user confirmation
6. Mark phase complete in plan
7. Proceed to Phase 2

**Best practices:**
✓ Complete one phase fully before moving to next
✓ Run verification after each phase
✓ Update checkboxes in the plan as you go
✓ Don't skip manual testing steps
✓ If blocked, update the plan—don't diverge
✓ For complex work, recompact into plan periodically

**Common pitfalls:**
❌ Implementing multiple phases before testing
❌ Skipping test failures to "come back later"
❌ Diverging from plan without updating it
❌ Not marking progress in plan
❌ Maxing out context window

**When to pause implementation:**
- After each phase completes
- When context > 70% utilized
- When encountering unexpected complexity
- When tests are failing and unclear why
- When plan needs significant changes

**Recompaction pattern:**
If implementation spans multiple days or contexts:
1. Update plan with current status
2. Note what's complete, what's in progress
3. Document any discoveries or blockers
4. Start fresh context with updated plan

### Topic: `context`

**Context Window Management Deep Dive**

**Why context matters:**
Your context window is the ONLY lever you have to affect AI output quality without retraining models.

**Optimization hierarchy:**
1. ❌ **Incorrect information** (most damaging)
   - Wrong file paths, outdated code, false assumptions
   - Prevents: Careful verification, research phase

2. ⚠️ **Missing information**
   - Incomplete understanding, missing edge cases
   - Prevents: Thorough research, asking questions

3. 📊 **Excessive noise**
   - File search results, debug logs, tool outputs
   - Prevents: Compaction, sub-agents

**Target utilization: 40-60%**
- Greenfield features: 40-50% (need room for exploration)
- Bug fixes: 50-60% (more focused)
- Complex refactoring: 40% (lots of discovery)

**When to start fresh context:**
✓ Moving from research → planning
✓ Moving from planning → implementation
✓ Completing a major phase
✓ Context utilization > 70%
✓ Conversation became noisy with debugging

**What to carry forward:**
- Load the research document
- Load the plan document
- Reference specific findings
- Don't copy entire conversation history

**What gets compacted:**
- File search results → Research document
- Implementation progress → Plan document (checkboxes)
- Debugging session → Updated plan or new research
- Error states → Status update in plan

### Topic: `patterns`

**Common Workflow Patterns**

### Pattern 1: Greenfield Feature

```bash
# 1. Research existing patterns
/research-codebase "How are similar features implemented?"

# 2. Create plan
/create-plan "Add new feature X"

# 3. Implement
/implement-plan thoughts/shared/plans/2025-01-05-feature-x.md
```

### Pattern 2: Bug Fix

```bash
# 1. Research to understand bug
/research-codebase "Why is X failing?"

# 2. Plan the fix
/create-plan thoughts/tickets/bug-123.md

# 3. Implement with tests
/implement-plan thoughts/shared/plans/2025-01-05-fix-bug-123.md
```

### Pattern 3: Refactoring

```bash
# 1. Research current implementation
/research-codebase "How does module X work currently?"

# 2. Plan incremental changes
/create-plan "Refactor module X for testability"

# 3. Implement with backwards compatibility
/implement-plan thoughts/shared/plans/2025-01-05-refactor-x.md
```

### Pattern 4: Complex Feature (Multi-Day)

```bash
# Day 1: Research and planning
/research-codebase "How should feature X integrate?"
/create-plan thoughts/tickets/feature-x.md

# Day 2: Implement Phase 1-2
/implement-plan thoughts/shared/plans/feature-x.md
# (Complete phases 1-2, update checkboxes)

# Day 3: Continue implementation
# Start fresh context, load plan
/implement-plan thoughts/shared/plans/feature-x.md
# (Continues from last completed phase)
```

### Pattern 5: Iterating on Plan

```bash
# After feedback or new discoveries
/iterate-plan thoughts/shared/plans/2025-01-05-feature-x.md

# Provide updates:
# - "Split Phase 2 into two phases"
# - "Add error handling for edge case Y"
# - "Update success criteria based on testing"
```

### Topic: `tips`

**Best Practices and Common Pitfalls**

### Research Phase

**✓ Do:**
- Be specific in questions
- Validate findings before planning
- Look for multiple pattern examples
- Document edge cases
- Include file:line references

**✗ Don't:**
- Skip research for "simple" tasks
- Accept vague or unclear findings
- Rely on assumptions
- Stop at surface-level understanding

### Planning Phase

**✓ Do:**
- Include specific file paths
- Write measurable success criteria
- Separate automated vs manual verification
- Plan incremental phases
- Resolve all open questions before finalizing

**✗ Don't:**
- Write vague plans
- Leave questions unresolved
- Create all-or-nothing plans
- Skip test strategy
- Forget database migrations

### Implementation Phase

**✓ Do:**
- Read entire plan first
- Complete one phase at a time
- Run all verification between phases
- Update checkboxes in plan
- Pause for manual testing

**✗ Don't:**
- Implement all phases before testing
- Skip test failures
- Diverge from plan without updating it
- Max out context window
- Rush manual testing

### Context Management

**✓ Do:**
- Keep utilization 40-60%
- Compact into documents
- Start fresh contexts regularly
- Carry forward key documents

**✗ Don't:**
- Let context max out
- Copy entire conversation history
- Keep all debugging in context
- Ignore context warnings

### Topic: `examples`

**Real-World Success Stories**

### Example 1: BAML 300k LOC Rust Codebase

**Task:** Fix a bug in large Rust codebase
**Developer:** Non-expert in the codebase
**Time:** 1 hour total
**Result:** PR approved without revision

**What worked:**
- Thorough research phase identified exact issue location
- Plan was simple and focused
- Implementation followed plan exactly
- Tests passed first try

**Key lesson:** Brownfield codebases are approachable with proper research

### Example 2: Complex Feature (35k LOC)

**Task:** Add cancellation support + WASM compilation
**Estimated time:** 3-5 days per senior engineer
**Actual time:** 7 hours (3 research/planning, 4 implementation)
**Result:** Both PRs completed with minimal revision

**What worked:**
- Upfront research investment (3 hours)
- Detailed plan with clear phases
- Incremental implementation
- Verification at each phase

**Key lesson:** Research time pays off exponentially

### Example 3: Failure Case - Hadoop Dependencies

**Task:** Remove dependencies from Parquet Java
**Issue:** Insufficient dependency tree exploration
**Result:** Failed to complete task

**What went wrong:**
- Research phase too shallow
- Didn't fully map dependency relationships
- Underestimated complexity
- Lacked domain expertise

**Key lesson:** Domain expertise matters; research depth requires adequate effort

## Measuring Success

**Good indicators:**
✓ Research documents consulted during planning
✓ Plans have specific file:line references
✓ Implementation rarely diverges from plan
✓ Tests pass between phases
✓ Manual testing catches edge cases early
✓ PRs require minimal revision
✓ Context windows stay under 70%

**Warning signs:**
⚠️ Skipping research phase
⚠️ Vague plans without specifics
⚠️ Implementing without testing
⚠️ Context window maxing out
⚠️ Frequent plan divergence
⚠️ PRs need major revisions

## Summary

The Research → Plan → Implement workflow succeeds through:
1. **Thorough research** before making decisions
2. **Clear planning** with specific implementation steps
3. **Incremental implementation** with verification
4. **Active engagement** at human checkpoints
5. **Context management** through intentional compaction

**Remember:** This is not magic—it requires your active participation at the highest-leverage points.

## Attribution

This workflow is inspired by and adapted from **HumanLayer's** research and implementation patterns for AI-assisted development.

**Original inspiration:**
- **Website:** [humanlayer.dev](https://humanlayer.dev)
- **GitHub:** [humanlayer/humanlayer](https://github.com/humanlayer/humanlayer)
- **Talk:** [AI Engineering Talk](https://youtu.be/rmvDxxNubIg?si=WtKgAdi6MydW8u-i) - Deep dive on context engineering for coding agents

**Additional resources:**
- [Advanced Context Engineering for Coding Agents](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents) - Detailed guide on the principles behind this workflow

The intentional compaction strategy and research → plan → implement pattern originated from HumanLayer's work on optimizing AI agent effectiveness through context window management.
