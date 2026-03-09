# Tech Stack

This documents the tech stack for projects built from this scaffold, and how to set it up from scratch after forking.

Run the scripts in `scripts/` to automate the setup. See below for what each piece does and how to configure it manually if needed.

---

## Stack Overview

| Layer | Technology |
|-------|-----------|
| **Framework** | SvelteKit + Svelte 5 (TypeScript) |
| **Styling** | Tailwind CSS 4 |
| **UI Components** | shadcn-svelte (new-york style) + Bits UI + Lucide Svelte |
| **Forms** | Superforms + Formsnap + Zod |
| **ORM** | Drizzle ORM |
| **Database (local)** | SQLite via Better SQLite3 |
| **Database (prod)** | Cloudflare D1 |
| **Auth** | Session-based (bcryptjs + HTTP-only cookies) |
| **Testing** | Playwright (E2E) + Vitest (unit) + axe-core (a11y) |
| **Linting/Formatting** | ESLint + Prettier |
| **Deployment** | Cloudflare Pages |
| **CI/CD** | GitHub Actions |

---

## Quick Setup

### 1. Create the app

```bash
bash scripts/setup-app.sh
```

This creates the `app/` folder, initialises a SvelteKit project, and installs all dependencies.

### 2. Configure Cloudflare

```bash
bash scripts/setup-cloudflare.sh
```

This creates a Cloudflare D1 database and writes the config into `app/wrangler.toml`.

### 3. Set up environment variables

```bash
cp app/.env.example app/.env
```

Edit `app/.env` with your local values.

### 4. Run migrations and seed

```bash
cd app
npm run db:migrate:local
npm run db:seed          # optional
```

### 5. Start the dev server

```bash
npm run dev
```

Dev server runs at `http://localhost:5173`.

---

## Frontend

### SvelteKit + Svelte 5

SvelteKit is the full-stack meta framework. All pages and API routes live under `src/routes/`. Server-only logic (DB access, auth) goes in `src/lib/server/`.

Svelte 5 uses the runes API (`$state`, `$derived`, `$effect`) instead of the older reactive stores.

### Tailwind CSS 4

Tailwind is configured via the Vite plugin. The base styles, CSS custom properties (design tokens), and shadcn-svelte theme variables all live in `src/app.css` (copied from `scripts/shadcn-base.css` during setup).

### shadcn-svelte + Bits UI + Lucide

[shadcn-svelte](https://shadcn-svelte.com) provides pre-built, styled UI components using the **new-york** style and a **slate** base color. Components are copied directly into `src/lib/components/ui/` via the shadcn CLI — they're your code, not a dependency.

**Bits UI** powers the interactive primitives (Dialog, Select, Accordion, etc.) underneath shadcn-svelte. **Lucide** provides icons.

**Components installed by default:**

| Component | Type |
|-----------|------|
| Accordion | Interactive (Bits UI) |
| Badge | Styling only |
| Button | Styling only |
| Card | Styling only |
| Checkbox | Interactive (Bits UI) |
| Dialog | Interactive (Bits UI) |
| Input | Styling only |
| Label | Interactive (Bits UI) |
| Select | Interactive (Bits UI) |
| Separator | Interactive (Bits UI) |
| Skeleton | Styling only |
| Switch | Interactive (Bits UI) |
| Tooltip | Interactive (Bits UI) |

To add more components after setup:
```bash
cd app
npx shadcn-svelte@latest add <component-name>
```

The shadcn config lives in `app/components.json`.

### Forms: Superforms + Formsnap + Zod

- **Zod** defines the validation schema
- **Superforms** handles server-side form actions with progressive enhancement
- **Formsnap** provides Svelte components that bind to Superforms state

---

## Backend & Database

### Drizzle ORM

Schema lives in `src/lib/server/db/schema.ts`. Migrations live in `migrations/` and are applied by wrangler. Generate new migrations with `npm run db:generate`.

```bash
npm run db:generate        # generate a new migration
npm run db:migrate:local   # apply locally
npm run db:migrate:remote  # apply to Cloudflare D1
npm run db:studio          # open Drizzle Studio GUI
npm run db:reset           # reset local DB
```

### Authentication

Session-based auth using HTTP-only cookies. Passwords hashed with bcryptjs. No third-party auth provider required.

---

## Testing

### E2E — Playwright

Tests live in `e2e/`. Run against a live dev server.

```bash
npm run test:e2e
```

### Unit — Vitest

Tests colocated with source files or in `src/__tests__/`.

```bash
npm run test:unit
```

### Accessibility — axe-core

Accessibility assertions are included in Playwright tests via `@axe-core/playwright`. Targets WCAG 2.0 AA.

---

## CI/CD

Two GitHub Actions workflows in `.github/workflows/`:

### `ci.yml` — Runs on PRs and pushes to `main`

1. `npm ci` — install dependencies
2. Install Playwright browsers
3. `npm run check` — type checking
4. `npm run lint` — linting
5. `npm run test:unit -- --run` — unit tests

### `deploy.yml` — Runs on push to `cloudflare` branch

1. `npm ci`
2. `npm run build`
3. `wrangler d1 migrations apply <db-name> --remote`
4. `wrangler pages deploy`

To deploy to production:

```bash
git push origin main:cloudflare
```

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API authentication |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_DATABASE_ID` | D1 database ID |
| `CLOUDFLARE_D1_TOKEN` | D1-specific token |

Add these under **Settings → Secrets and variables → Actions** in your GitHub repo.

---

## Cloud Infrastructure

All infrastructure runs on **Cloudflare**.

| Service | Purpose |
|---------|---------|
| **Cloudflare Pages** | Hosts the SvelteKit SSR app at the edge |
| **Cloudflare D1** | Serverless SQLite database for production |

### Cloudflare Pages Setup

GitHub Actions is the sole deployment mechanism. The Cloudflare Pages project is created automatically on the first deploy via `wrangler pages deploy` in the Actions workflow.

**Do not connect your GitHub repo in the Cloudflare dashboard.** Doing so enables a direct Git integration build that runs separately from GitHub Actions and will fail (it runs `npm run build` from the repo root, where there is no `package.json`).

To deploy to production, push to the `cloudflare` branch:

```bash
git push origin main:cloudflare
```

Add any environment variables under **Workers & Pages → your project → Settings → Variables** in the Cloudflare dashboard after the first deploy.

### Manual Wrangler Setup (if not using the script)

```bash
npm install -g wrangler
wrangler login
wrangler d1 create <your-db-name>
```

Then update `app/wrangler.toml`:

```toml
name = "<your-app-name>"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "<your-db-name>"
database_id = "<your-database-id>"
```
