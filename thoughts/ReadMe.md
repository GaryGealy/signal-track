# thoughts/

This folder is where you put project context for Claude to use when building your app.

## What goes here

- **Design specs** — describe what you want to build, the features, the UX, the data model
- **Tech decisions** — document architectural choices and why you made them
- **Research notes** — anything you want Claude to reference when planning or coding

## How Claude uses it

When you run skills like `create-plan`, `research-codebase`, or `implement-plan`, Claude reads the files in this folder to understand your project goals and context before writing any code.

## Suggested structure

```
thoughts/
├── specs/          # Feature specs and requirements
├── decisions/      # Architectural decisions and rationale
└── tech-stack.md   # Tech stack reference (included by default)
```

Start by adding a markdown file describing what you want to build, then ask Claude to create a plan.
