# Research-Plan-Implement Plugin

AI-powered workflow generator that analyzes your project and creates customized research, planning, and implementation commands tailored to your specific tech stack.

## What It Does

This plugin generates a complete "research → plan → implement" workflow in your project's `.claude/` directory by:

1. **Analyzing your project** - Reads your `package.json`, `Cargo.toml`, `go.mod`, or `pyproject.toml` to understand your stack
2. **Adapting intelligently** - Uses Claude's reasoning (not brittle templates) to customize commands for your tools
3. **Generating workflow** - Creates commands and agents that work natively with your project's build system

**No templates. No hardcoded rules. Just intelligent adaptation.**

## Generated Workflow

### Commands You Get

- `/research-codebase` - Research your codebase using parallel sub-agents, create research documents
- `/create-plan` - Create detailed implementation plans through interactive research
- `/iterate-plan` - Update existing plans based on feedback
- `/implement-plan` - Execute plans with automated verification and testing checkpoints

### Agents You Get

- `codebase-locator` - Find WHERE code lives (files, directories, components)
- `codebase-analyzer` - Analyze HOW code works (data flow, implementation details)
- `codebase-pattern-finder` - Find similar patterns and examples to model after
- `web-search-researcher` - Research external docs and resources
- `thoughts-locator` - Find documents in thoughts/ directory (optional)
- `thoughts-analyzer` - Extract insights from thought documents (optional)

## Installation

### Option 1: Local Development (Recommended for Testing)

1. Clone or download this plugin:
   ```bash
   cd ~/your-plugins-directory
   git clone <this-repo> research-plan-implement
   ```

2. Symlink or copy to Claude's plugins directory:
   ```bash
   # macOS/Linux
   ln -s ~/your-plugins-directory/research-plan-implement ~/.claude/plugins/research-plan-implement

   # Or copy directly
   cp -r ~/your-plugins-directory/research-plan-implement ~/.claude/plugins/
   ```

3. Enable the plugin in your project's `.claude/settings.json`:
   ```json
   {
     "enabledPlugins": ["research-plan-implement"]
   }
   ```

### Option 2: Claude Marketplace (Future)

Once published to the marketplace:
```bash
claude plugins install research-plan-implement
```

## Usage

### Quick Start

1. Navigate to your project directory
2. Run the setup skill:
   ```bash
   /setup
   ```
3. Answer a few questions about your preferences
4. Start using the generated commands!

### What Gets Generated

The plugin creates this structure in your project:

```
.claude/
├── commands/
│   ├── research-codebase.md
│   ├── create-plan.md
│   ├── iterate-plan.md
│   └── implement-plan.md
└── agents/
    ├── codebase-analyzer.md
    ├── codebase-locator.md
    ├── codebase-pattern-finder.md
    ├── thoughts-analyzer.md      # If thoughts/ enabled
    ├── thoughts-locator.md       # If thoughts/ enabled
    └── web-search-researcher.md
```

### Example: TypeScript/SvelteKit Project

**Before running setup:**
```json
// package.json
{
  "scripts": {
    "test:unit": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write .",
    "build": "vite build"
  }
}
```

**After running setup:**

Generated commands will use your actual scripts:
- ✓ Tests: `npm run test:unit` (not generic `npm test`)
- ✓ Linting: `npm run lint`
- ✓ Formatting: `npm run format`
- ✓ Build: `npm run build`
- ✓ Database: `npx prisma@6 db push` (if Prisma detected)

### Example: Rust Project

**Before running setup:**
```toml
# Cargo.toml
[package]
name = "my-api"
```

**After running setup:**

Generated commands will use Rust tooling:
- ✓ Tests: `cargo test`
- ✓ Linting: `cargo clippy`
- ✓ Formatting: `cargo fmt`
- ✓ Build: `cargo build`

### Example: Python/Django Project

**Before running setup:**
```toml
# pyproject.toml
[tool.poetry]
dependencies = { django = "^4.0" }
```

**After running setup:**

Generated commands will use Django patterns:
- ✓ Tests: `pytest tests/unit`
- ✓ Linting: `ruff check .`
- ✓ Formatting: `black .`
- ✓ Migrations: `python manage.py migrate`

## Understanding the Workflow

This plugin implements **intentional compaction**—a strategy for managing AI agent context windows by distilling progress into structured artifacts (research docs, plans) before starting fresh contexts.

**Why it matters:** Your context window is your ONLY lever to affect output quality without retraining models.

### The Three Phases

1. **Research** - Explore codebase without polluting main context
2. **Plan** - Create exact implementation specification
3. **Implement** - Execute phase-by-phase with verification

**Run `/workflow-guide` to learn how to use this workflow effectively.**

## Typical Workflow

### 1. Research the Codebase

```bash
/research-codebase "How does user authentication work?"
```

This spawns parallel agents to:
- Locate auth-related files
- Analyze how authentication is implemented
- Find usage patterns and examples
- Create a research document in `thoughts/shared/research/`

### 2. Create Implementation Plan

```bash
/create-plan thoughts/tickets/add-oauth-support.md
```

This:
- Reads the ticket
- Researches relevant code patterns
- Asks clarifying questions
- Creates detailed plan in `thoughts/shared/plans/`

### 3. Iterate on Plan

```bash
/iterate-plan thoughts/shared/plans/2025-01-05-add-oauth.md
```

Update the plan based on feedback, new discoveries, or changed requirements.

### 4. Implement the Plan

```bash
/implement-plan thoughts/shared/plans/2025-01-05-add-oauth.md
```

This:
- Reads the plan
- Implements each phase
- Runs automated verification (tests, linting, builds)
- Pauses for manual testing between phases
- Updates checkboxes in the plan as progress is made

## Supported Project Types

Currently adapts intelligently to:

### Languages
- ✅ TypeScript/JavaScript (Node.js, Deno, Bun)
- ✅ Python
- ✅ Go
- ✅ Rust

### Frameworks
- ✅ SvelteKit
- ✅ Next.js
- ✅ Django
- ✅ FastAPI
- ✅ Generic frameworks (with sensible defaults)

### Build Systems
- ✅ npm/yarn/pnpm scripts
- ✅ Makefile
- ✅ Cargo
- ✅ Poetry
- ✅ Go modules

### Databases
- ✅ Prisma
- ✅ Drizzle
- ✅ SQLAlchemy
- ✅ Django ORM
- ✅ Diesel

## Philosophy

This plugin generates workflows that follow these principles:

1. **Documentarian Approach** - Research and document what EXISTS, not what SHOULD BE
2. **Parallel Sub-Agents** - Spawn specialized agents concurrently for efficiency
3. **Interactive Planning** - Iterative, collaborative plan creation with user feedback
4. **Automated + Manual Verification** - Clear separation of what can be automated vs requires human testing

## Customization

### After Generation

All generated files are standard markdown in `.claude/` - you can edit them freely:

- Add project-specific guidance
- Customize success criteria
- Add more agents
- Modify workflows

### Preserving Customizations

When you re-run `/setup`, it will:
1. Detect existing `.claude/` files
2. Ask which files to regenerate
3. Preserve your custom sections

### Sharing with Team

Commit `.claude/` to version control so your team gets the same workflow:

```bash
git add .claude/
git commit -m "Add research/plan/implement workflow"
git push
```

## Troubleshooting

### "I couldn't detect your project type"

The plugin looks for:
- `package.json` (Node/TypeScript)
- `Cargo.toml` (Rust)
- `go.mod` (Go)
- `pyproject.toml` or `requirements.txt` (Python)

If none exist, it will ask you to manually specify your stack.

### "Reference templates not found"

This means the plugin isn't installed correctly. Ensure:
1. Plugin is in Claude's plugins directory
2. `skills/setup/reference/` directory exists
3. Reference templates are present

### Generated commands don't match my project

The plugin adapts based on what it finds in config files. If it gets something wrong:
1. Re-run `/setup` with correct info
2. Manually edit the generated `.claude/` files
3. File an issue so we can improve detection

## Examples

### Research Example

```bash
/research-codebase "How do we handle database migrations?"
```

**Output:**
- Research document at `thoughts/shared/research/2025-01-05-database-migrations.md`
- Includes file references, code examples, and architecture notes
- Documents current state without recommendations

### Planning Example

```bash
/create-plan "Add two-factor authentication"
```

**Process:**
1. Asks clarifying questions
2. Researches existing auth code
3. Proposes implementation phases
4. Creates plan at `thoughts/shared/plans/2025-01-05-add-2fa.md`

### Implementation Example

```bash
/implement-plan thoughts/shared/plans/2025-01-05-add-2fa.md
```

**Process:**
1. Reads plan
2. Implements Phase 1
3. Runs tests: `npm run test:unit`
4. Runs linting: `npm run lint`
5. Pauses for manual testing
6. Continues to Phase 2 after confirmation

## Contributing

Contributions welcome! Areas we'd love help with:

- Additional language support (Java, C#, PHP, etc.)
- Framework-specific guidance improvements
- Better project detection heuristics
- Documentation improvements

## License

MIT

## Credits

Original workflow concept from the [HumanLayer](https://github.com/humanlayer/humanlayer) project, adapted and generalized for broader use.
