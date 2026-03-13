# SignalTrack

A personal health metrics tracker for logging and visualizing weight, blood pressure, sleep, and work hours over time.

Built with SvelteKit, Drizzle ORM, and deployed to Cloudflare Pages.

## Features

- **Dashboard** — metric cards with sparklines and empty states for each tracked signal
- **Detail pages** — full-width line chart, 7d/30d/90d/All time range picker, scrollable history, and delete entries
- **Auth** — register and login with email/password (session-based)
- **Metrics tracked** — Weight (lbs), Blood Pressure (systolic/diastolic mmHg), Sleep (hours/minutes), Work hours

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2 + Svelte 5 |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Styling | Tailwind CSS 4 |
| Deployment | Cloudflare Pages |
| CI/CD | GitHub Actions |

## Getting Started

### Requirements

- Node.js 20+
- A [Cloudflare account](https://cloudflare.com) (free tier is fine)

### Local development

```bash
cd app
npm ci
cp .env.example .env        # set DATABASE_URL=local.db
npm run db:push             # initialize local SQLite schema
npm run dev
```

### Seed demo data

```bash
cd app
npx tsx scripts/seed-test-user.ts
```

Creates a user **Try Me** (`tryme@gmail.com` / `Password!123`) with 30 days of realistic health data.

## Deploying to Production

### One-time Cloudflare setup

```bash
cd app
npx wrangler login
npx wrangler pages project create signal-track --production-branch=main
```

Add these secrets to your GitHub repo under **Settings → Secrets and variables → Actions**:

| Secret | Where to find it |
|--------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens (Pages + D1 edit permissions) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar |

> **Do not** connect the repo in the Cloudflare dashboard — that creates a duplicate build pipeline.

### Cutting a release

Deploys are triggered by publishing a GitHub release. Use `/cut-a-release` in Claude Code to run the full release workflow — it handles versioning, changelog, tagging, and GitHub release creation automatically.

To trigger a deploy manually without a new release:

```bash
gh workflow run "Deploy to Cloudflare Pages"
```

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Active development — merge PRs here |

Releases are cut from `main` via `release/vX.Y.Z` branches.
