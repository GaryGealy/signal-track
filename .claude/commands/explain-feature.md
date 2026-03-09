---
description: Learn how a feature or technology is implemented in this codebase
model: sonnet
---

# Explain Feature

You are tasked with helping the user understand how a specific feature or technology is implemented in this codebase. Your goal is to create an educational walkthrough using actual code from the project.

**Topic provided by user:** $ARGUMENTS

## Initial Setup

When this command is invoked, check if a topic was provided in `$ARGUMENTS` above.

**If NO topic was provided** (empty or blank), use the **AskUserQuestion** tool to ask what feature or technology they'd like to learn about. Provide these example categories:

- **Authentication & Security** - login, sessions, permissions
- **Data & Database** - queries, schemas, migrations
- **Forms & Validation** - input handling, error display
- **API & Routing** - endpoints, middleware, request handling
- **UI Components** - specific components, layouts, state
- **Infrastructure** - configuration, deployment, environment

**If a topic WAS provided**, proceed directly to the topic scoping step.

## Topic Scoping

Before proceeding, evaluate if the topic needs adjustment:

**If topic is too broad** (e.g., "everything", "the whole app", "how it works"):
- Use **AskUserQuestion** to ask the user to narrow it down
- Suggest 3-4 specific aspects they might be interested in

**If topic is too narrow** (e.g., a specific variable name, single line of code):
- Acknowledge the specific item
- Offer to explain the broader context/system it belongs to

**If topic seems appropriate**, proceed to detail level selection.

## Detail Level Selection

Once you have a well-scoped topic, use the **AskUserQuestion** tool to ask the user to select their preferred detail level:

1. **Quick Overview** (~2-3 minutes) - High-level summary with key files and patterns
2. **Standard Walkthrough** (~5-10 minutes) - Step-by-step explanation with code snippets and flow diagrams
3. **Deep Dive** (~15-20 minutes) - Comprehensive analysis including edge cases, related systems, and architectural context

Wait for the user to select a level before proceeding.

## Research Phase

After receiving both the topic and detail level:

1. **Use TodoWrite** to track your progress through the explanation

2. **Use the Task tool** with the `Explore` subagent_type for initial discovery of the feature

3. **Use the Task tool** with specialized subagent_types to gather details:
   - `codebase-locator` - to find files related to the topic
   - `codebase-analyzer` - to understand how specific implementations work
   - `codebase-pattern-finder` - to find usage examples

4. **Gather code snippets** that illustrate the implementation using the **Read** tool

## Validation Phase

After research, validate that you found relevant content:

**If the topic exists and is well-documented in the codebase:**
- Proceed to the Interactive Presentation phase

**If the topic doesn't exist or wasn't found:**
- Clearly tell the user: "I couldn't find [topic] implemented in this codebase."
- List what related features DO exist that you discovered during research
- Use **AskUserQuestion** to offer alternatives:
  - Search for a different topic
  - Explain a related feature you found
  - End the explanation

**If the topic is partially implemented or unclear:**
- Explain what you found and what's missing
- Offer to explain what IS there, or search for something else

## Interactive Presentation

**IMPORTANT:** Present the explanation ONE SECTION AT A TIME. Show progress by indicating which section the user is on (e.g., "**Section 2 of 5: Architecture Overview**").

After each section, use the **AskUserQuestion** tool to ask if the user wants to:
1. Continue to the next section
2. Get more detail on what was just explained
3. Ask a specific question

This allows users to learn at their own pace and dive deeper where needed.

## Explanation Structure by Detail Level

### Level 1: Quick Overview (4 sections)

Present these sections one at a time, pausing after each:

1. **What it does** - 1-2 sentence summary
2. **Key files** - List of 3-5 most important files with paths
3. **Basic pattern** - One code snippet showing the core concept
4. **How to use it** - Quick example of how to work with this feature

### Level 2: Standard Walkthrough (5 sections)

Present these sections one at a time, pausing after each:

1. **Introduction** - What the feature does and why it exists
2. **Architecture overview** - How components fit together (use ASCII diagram if helpful)
3. **Step-by-step walkthrough** - Present each step individually:
   - Start from the entry point
   - Follow the data/control flow
   - Show 1-2 code snippets per step with explanations
   - Highlight key decisions and patterns
4. **Common usage patterns** - 2-3 examples from the codebase
5. **Key files reference** - Table of relevant files with descriptions

### Level 3: Deep Dive (10 sections)

Present all Level 2 sections, plus these additional sections (one at a time):

6. **Historical context** - Check for design documentation in common locations:
   - `thoughts/` directory (if it exists)
   - `docs/` directory
   - README files in relevant directories
   - Git commit history for the feature
   - If no docs found, note that and continue
7. **Edge cases and error handling** - How the system handles failures
8. **Related systems** - How this connects to other features
9. **Configuration options** - Environment variables, settings, etc.
10. **Testing approach** - How this feature is tested (if tests exist)

**Optional: External Context**
For Deep Dive level, if the feature relies heavily on external frameworks or libraries (e.g., SvelteKit, Drizzle ORM, Zod), consider using **WebSearch** to provide brief context on how the framework handles this pattern. Only do this if it adds significant value to understanding the implementation.

## After Each Section

After presenting each section, show progress and use **AskUserQuestion** with these options:

Example: "**Section 3 of 5 complete.**"

- **Continue** - Move to the next section
- **Go deeper** - Explain the current section in more detail with additional code examples
- **Ask a question** - Let user type a specific question about what was just covered

If the user selects "Go deeper", provide additional context, more code snippets, or related implementation details before asking again. If they select "Ask a question", answer their question thoroughly before continuing.

## Formatting Guidelines

1. **Use code blocks with file paths**:
   ```typescript
   // app/src/lib/server/auth.ts:45-52
   export function validateSession(sessionId: string) {
     // ... actual code from the file
   }
   ```

2. **Include line numbers** when referencing specific code: `app/src/routes/+page.svelte:23`

3. **Use ASCII diagrams** for flow visualization:
   ```
   Request → Middleware → Route Handler → Database → Response
   ```

4. **Bold key concepts** and use consistent terminology

5. **Break complex explanations** into numbered steps

6. **Show section progress**: "**Section 2 of 5: Architecture Overview**"

## Important Notes

- Always use ACTUAL code from this codebase, not generic examples
- Read files fully before extracting snippets
- Focus on explaining HOW things work, not critiquing them
- If the feature doesn't exist in the codebase, tell the user clearly and offer alternatives
- Offer to answer follow-up questions after your explanation
- The main application code is in the `app/` subdirectory

## After All Sections Complete

When the user has gone through all sections, use **AskUserQuestion** with these final options:

- **All done** - End the explanation
- **Explain a related feature** - Start a new explanation on a connected topic
- **Review a section** - Go back to a specific section for more detail

If "All done", end with a brief summary of what was covered and remind them they can run `/explain-feature [topic]` anytime to learn about other features.
