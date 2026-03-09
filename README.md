# humanlayer-scaffolding

A starting point for new projects using the HumanLayer Claude setup, pre-configured with SvelteKit, shadcn-svelte, Drizzle ORM, and Cloudflare deployment.

## Getting Started

1. **Fork this repo** on GitHub to use it as the base for your new project

2. **Clone your fork** locally
   ```bash
   git clone https://github.com/<your-username>/<your-new-repo>.git
   cd <your-new-repo>
   ```

   > **Requirements:** Node.js 20+ and a [Cloudflare account](https://cloudflare.com) (free tier is fine)
   >
   > **Windows users:** The setup scripts require a bash shell. Use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) or Git Bash.

3. **Run the setup scripts** to scaffold the app, install dependencies, and configure Cloudflare:
   ```bash
   bash scripts/setup-app.sh
   bash scripts/setup-cloudflare.sh
   ```

   The `scripts/` folder also includes:
   - `.env.example` — environment variable template (copied to `app/` by setup)
   - `components.json` — shadcn-svelte config (copied to `app/` by setup)
   - `shadcn-base.css` — shadcn CSS variables and Tailwind base styles (copied to `app/src/app.css`)
   - `migrations/` — initial D1 migration SQL files (copied to `app/migrations/` by setup)
   - `workflows/ci.yml` — GitHub Actions CI pipeline (copied to `.github/workflows/`)
   - `workflows/deploy.yml` — GitHub Actions deploy pipeline (copied to `.github/workflows/`)

   See [`thoughts/tech-stack.md`](thoughts/tech-stack.md) for the full tech stack, setup details, CI/CD pipeline, and Cloudflare infrastructure setup.

4. **Add your design specs** — create markdown files in the `thoughts/` folder describing what you want to build

5. **Start building** — the `.claude/` folder is already set up and ready to use

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Active development — merge PRs here |

## Deploying to Production

Deploys are triggered by publishing a GitHub release. Use the `/cut-a-release` skill to run the full release workflow, which handles versioning, changelog, and GitHub release creation automatically.

The deploy pipeline (`.github/workflows/deploy.yml`) runs on the `release: published` event.

## Global Plugins

These plugins should be installed globally in `~/.claude/settings.json` to get the full experience:

| Plugin | Purpose |
|--------|---------|
| **superpowers** | Structured dev workflow (brainstorming, TDD, subagent-driven dev) |
| **plugin-dev** | Tools for building Claude Code plugins |
| **frontend-design** | Production-grade frontend UI generation |
| **feature-dev** | Guided feature development with architecture focus |
| **github** | GitHub integration (issues, PRs, etc.) |
| **playwright** | Browser automation and testing |
| **claude-md-management** | Audit and improve CLAUDE.md files |
| **code-simplifier** | Refactor and simplify code for clarity |
| **stripe** | Stripe integration best practices and helpers |

All plugins are from the `claude-plugins-official` marketplace. Install them with:

```bash
/plugin marketplace add claude-plugins-official
/plugin install superpowers@claude-plugins-official
/plugin install plugin-dev@claude-plugins-official
/plugin install frontend-design@claude-plugins-official
/plugin install feature-dev@claude-plugins-official
/plugin install github@claude-plugins-official
/plugin install playwright@claude-plugins-official
/plugin install claude-md-management@claude-plugins-official
/plugin install code-simplifier@claude-plugins-official
/plugin install stripe@claude-plugins-official
```
