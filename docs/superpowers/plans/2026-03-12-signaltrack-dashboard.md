# SignalTrack Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the SignalTrack mobile dashboard page (`/dashboard`) with the "Warmth" design — 4 metric summary cards with inline sparklines and a bottom tab bar.

**Architecture:** SvelteKit route at `/dashboard` with a shared layout that renders the bottom tab bar. A `+page.server.ts` loads the latest metric entry and last 14 data points per metric for sparklines. Components are small and focused: `Sparkline.svelte` handles SVG path math, `MetricCard.svelte` composes the card UI.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), Drizzle ORM + better-sqlite3 (local) / D1 (prod), Tailwind CSS 4, DM Sans (Google Fonts), Lucide Svelte icons, Playwright (e2e tests)

**Design spec:** `docs/superpowers/specs/2026-03-12-signaltrack-warmth-dashboard-design.md`

**Auth note:** Auth is stubbed in this plan — the server load function returns seed data for a hardcoded dev user. Real session-based auth will be wired in a future plan.

**Testing note:** Components (Sparkline, MetricCard) are covered by the Playwright e2e tests rather than unit tests. This is an acceptable MVP trade-off — the components are small, have no business logic, and are fully exercised by the dashboard e2e tests. Unit tests for `buildPath()` edge cases can be added in a future plan if the sparkline logic grows in complexity.

**Safe area note:** Tab bar uses fixed `pb-7` (28px) bottom padding rather than `env(safe-area-inset-bottom)`. This is fine for MVP and development. Wire up CSS env() safe area insets when building for real device testing.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `app/src/app.html` | Add DM Sans Google Font link |
| Modify | `app/src/app.css` | Add Design B CSS tokens |
| Replace | `app/src/lib/server/db/schema.ts` | Real DB schema (users + metric_entries) |
| Create | `app/src/lib/server/db/seed.ts` | Dev seed data for dashboard |
| Create | `app/src/routes/+page.server.ts` | Redirect to `/dashboard` (server-side) |
| Delete | `app/src/routes/+page.svelte` | Remove placeholder page |
| Create | `app/src/routes/dashboard/+layout.svelte` | Bottom tab bar shell |
| Create | `app/src/routes/dashboard/+layout.server.ts` | Auth stub |
| Create | `app/src/routes/dashboard/+page.svelte` | Dashboard page |
| Create | `app/src/routes/dashboard/+page.server.ts` | Load metric summaries |
| Create | `app/src/lib/components/Sparkline.svelte` | Inline SVG sparkline |
| Create | `app/src/lib/components/MetricCard.svelte` | Metric summary card |
| Create | `app/e2e/dashboard.spec.ts` | Playwright e2e tests |

---

## Before Starting: Create a feature branch

```bash
git checkout -b feat/warmth-dashboard
```

---

## Chunk 1: Foundation (DB Schema + Theme + Font)

### Task 1: Replace DB schema with real metric tables

**Files:**
- Replace: `app/src/lib/server/db/schema.ts`

The product spec calls for a unified `metric_entries` table alongside a `users` table.

- [ ] **Step 1: Write the new schema**

Replace `app/src/lib/server/db/schema.ts` with:

```typescript
import { integer, real, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
});

export const metricEntries = sqliteTable(
  'metric_entries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    metricType: text('metric_type', {
      enum: ['weight', 'blood_pressure', 'sleep', 'work']
    }).notNull(),
    valueNumeric: real('value_numeric'),
    valueSecondary: real('value_secondary'),
    valueDuration: integer('value_duration'),
    recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
  },
  (table) => [
    index('idx_user_id').on(table.userId),
    index('idx_metric_type').on(table.metricType),
    index('idx_recorded_at').on(table.recordedAt),
    index('idx_user_metric_recorded').on(table.userId, table.metricType, table.recordedAt)
  ]
);

export type MetricType = 'weight' | 'blood_pressure' | 'sleep' | 'work';
export type MetricEntry = typeof metricEntries.$inferSelect;
export type NewMetricEntry = typeof metricEntries.$inferInsert;
```

- [ ] **Step 2: Generate and apply the migration**

```bash
cd app
npm run db:generate
npm run db:push
```

Expected: migration files created in `app/drizzle/`, tables created in local SQLite DB.

- [ ] **Step 3: Create dev seed file**

Create `app/src/lib/server/db/seed.ts`:

```typescript
import { db } from './index';
import { users, metricEntries } from './schema';
import { eq } from 'drizzle-orm';

const DEV_USER_ID = 'dev-user-001';

async function seed() {
  // Insert dev user — idempotent via primary key conflict
  await db
    .insert(users)
    .values({
      id: DEV_USER_ID,
      email: 'dev@example.com',
      passwordHash: 'not-a-real-hash',
      name: 'Gary'
    })
    .onConflictDoNothing();

  // Guard: skip metric seeding if entries already exist for this user
  const existing = await db
    .select({ id: metricEntries.id })
    .from(metricEntries)
    .where(eq(metricEntries.userId, DEV_USER_ID))
    .limit(1);

  if (existing.length > 0) {
    console.log('Seed data already present — skipping metric inserts.');
    return;
  }

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  // Weight: 14 entries, slight downward trend
  const weightValues = [188, 187, 186.5, 186, 185.5, 185, 184.5, 184, 183.5, 183.5, 183, 183, 183, 183];
  for (let i = 0; i < 14; i++) {
    await db.insert(metricEntries).values({
      userId: DEV_USER_ID,
      metricType: 'weight',
      valueNumeric: weightValues[i],
      recordedAt: new Date(now.getTime() - (13 - i) * day)
    });
  }

  // Blood pressure: 14 entries
  const bpValues = [
    [122, 80], [120, 78], [119, 77], [121, 79], [118, 76],
    [120, 78], [117, 76], [119, 77], [118, 75], [120, 78],
    [117, 76], [118, 76], [118, 76], [118, 76]
  ];
  for (let i = 0; i < 14; i++) {
    await db.insert(metricEntries).values({
      userId: DEV_USER_ID,
      metricType: 'blood_pressure',
      valueNumeric: bpValues[i][0],
      valueSecondary: bpValues[i][1],
      recordedAt: new Date(now.getTime() - (13 - i) * day)
    });
  }

  // Sleep: 14 entries (stored as minutes)
  const sleepValues = [420, 450, 390, 480, 440, 460, 420, 430, 440, 450, 460, 435, 442, 442];
  for (let i = 0; i < 14; i++) {
    await db.insert(metricEntries).values({
      userId: DEV_USER_ID,
      metricType: 'sleep',
      valueDuration: sleepValues[i],
      recordedAt: new Date(now.getTime() - (13 - i) * day)
    });
  }

  // Work: 14 entries (stored as minutes)
  const workValues = [480, 420, 510, 390, 450, 480, 360, 420, 450, 480, 405, 390, 405, 405];
  for (let i = 0; i < 14; i++) {
    await db.insert(metricEntries).values({
      userId: DEV_USER_ID,
      metricType: 'work',
      valueDuration: workValues[i],
      recordedAt: new Date(now.getTime() - (13 - i) * day)
    });
  }

  console.log('Seed complete.');
}

seed().catch(console.error);
```

- [ ] **Step 4: Run the seed**

```bash
cd app
npx tsx src/lib/server/db/seed.ts
```

Expected: "Seed complete." — no errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/server/db/schema.ts app/src/lib/server/db/seed.ts app/drizzle/
git commit -m "feat: add users and metric_entries DB schema with dev seed"
```

---

### Task 2: Add Design B CSS tokens

**Files:**
- Modify: `app/src/app.css`

- [ ] **Step 1: Add warmth tokens to `:root`**

In `app/src/app.css`, add inside the existing `:root` block (after the last shadcn variable):

```css
/* Design B — Warmth tokens */
--color-bg: #FAF7F2;
--color-surface: #FFFFFF;
--color-border: #EFE8DE;
--color-text-primary: #2C1A0E;
--color-text-muted: #9A7E6A;
--color-accent: #C4622D;
--color-accent-bg: #FDF0E8;
```

Also update the `body` rule in the `@layer base` block:

```css
body {
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  font-family: 'DM Sans', sans-serif;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/app.css
git commit -m "feat: add Design B warmth CSS tokens"
```

---

### Task 3: Add DM Sans font

**Files:**
- Modify: `app/src/app.html`

- [ ] **Step 1: Add Google Fonts link**

In `app/src/app.html`, inside `<head>` before `%sveltekit.head%`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 2: Verify font loads**

```bash
cd app && npm run dev
```

Open browser dev tools → Network tab → filter "fonts.gstatic" — confirm DM Sans is requested.

- [ ] **Step 3: Commit**

```bash
git add app/src/app.html
git commit -m "feat: load DM Sans from Google Fonts"
```

---

## Chunk 2: Route Structure & Navigation

### Task 4: Redirect root to `/dashboard`

**Files:**
- Create: `app/src/routes/+page.server.ts`
- Delete: `app/src/routes/+page.svelte` (placeholder — remove entirely)

SvelteKit redirects must happen in a server context. The existing `+page.svelte` is a placeholder and can be removed.

- [ ] **Step 1: Write the e2e test first**

Create `app/e2e/dashboard.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('root redirects to dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/dashboard');
});

test('dashboard shows page title', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Your signals')).toBeVisible();
});

test('dashboard shows all 4 metric cards', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Weight')).toBeVisible();
  await expect(page.getByText('Blood Pressure')).toBeVisible();
  await expect(page.getByText('Sleep')).toBeVisible();
  await expect(page.getByText('Work')).toBeVisible();
});

test('dashboard shows bottom tab bar', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('navigation')).toBeVisible();
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd app && npm test
```

Expected: 4 failures (routes don't exist yet).

- [ ] **Step 3: Create the server-side redirect and remove the placeholder page**

Create `app/src/routes/+page.server.ts`:

```typescript
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(307, '/dashboard');
```

Delete `app/src/routes/+page.svelte` — it is no longer needed.

```bash
rm app/src/routes/+page.svelte
```

- [ ] **Step 4: Commit**

```bash
git add app/src/routes/+page.server.ts app/e2e/dashboard.spec.ts
git rm app/src/routes/+page.svelte
git commit -m "feat: redirect root to /dashboard, add e2e test stubs"
```

---

### Task 5: Dashboard layout with bottom tab bar

**Files:**
- Create: `app/src/routes/dashboard/+layout.svelte`
- Create: `app/src/routes/dashboard/+layout.server.ts`

- [ ] **Step 1: Create the auth stub layout server file**

Create `app/src/routes/dashboard/+layout.server.ts`:

```typescript
import type { LayoutServerLoad } from './$types';

// TODO: Replace with real session auth when auth plan is implemented.
// For now, returns a hardcoded dev user so the dashboard renders with seed data.
export const load: LayoutServerLoad = async () => {
  return {
    user: {
      id: 'dev-user-001',
      name: 'Gary'
    }
  };
};
```

- [ ] **Step 2: Create the dashboard layout with tab bar**

Create `app/src/routes/dashboard/+layout.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { LayoutGrid, User, Droplets, Moon, Briefcase } from 'lucide-svelte';

  let { children, data } = $props();

  const tabs = [
    { label: 'Home', icon: LayoutGrid, href: '/dashboard' },
    { label: 'Weight', icon: User, href: '/dashboard/weight' },
    { label: 'BP', icon: Droplets, href: '/dashboard/blood-pressure' },
    { label: 'Sleep', icon: Moon, href: '/dashboard/sleep' },
    { label: 'Work', icon: Briefcase, href: '/dashboard/work' }
  ];
</script>

<div class="flex h-dvh flex-col" style="background: var(--color-bg);">
  <!-- Scrollable content -->
  <main class="min-h-0 flex-1 overflow-y-auto">
    {@render children()}
  </main>

  <!-- Bottom tab bar -->
  <nav
    aria-label="Main navigation"
    class="flex shrink-0 items-center pb-7"
    style="background: var(--color-surface); border-top: 1px solid var(--color-border);"
  >
    {#each tabs as tab}
      {@const isActive = page.url.pathname === tab.href}
      <a
        href={tab.href}
        class="flex flex-1 flex-col items-center gap-1 pt-3"
        aria-current={isActive ? 'page' : undefined}
      >
        <tab.icon
          size={22}
          style="color: {isActive ? 'var(--color-accent)' : 'var(--color-text-muted)'};"
        />
        <span
          class="text-[10px]"
          style="
            color: {isActive ? 'var(--color-accent)' : 'var(--color-text-muted)'};
            font-weight: {isActive ? '600' : '500'};
          "
        >
          {tab.label}
        </span>
      </a>
    {/each}
  </nav>
</div>
```

- [ ] **Step 3: Run type check**

```bash
cd app && npm run check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/routes/dashboard/
git commit -m "feat: add dashboard layout with bottom tab bar"
```

---

## Chunk 3: Dashboard Components & Page

### Task 6: Sparkline SVG component

**Files:**
- Create: `app/src/lib/components/Sparkline.svelte`

The sparkline takes an array of numbers and renders a scaled SVG polyline with a dot at the latest value.

- [ ] **Step 1: Create the component**

Create `app/src/lib/components/Sparkline.svelte`:

```svelte
<script lang="ts">
  interface Props {
    values: number[];
    width?: number;
    height?: number;
    color?: string;
    secondaryValues?: number[];
    secondaryColor?: string;
  }

  let {
    values,
    width = 96,
    height = 36,
    color = 'var(--color-accent)',
    secondaryValues,
    secondaryColor = '#E8A882'
  }: Props = $props();

  function buildPath(data: number[], w: number, h: number): string {
    if (data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 4; // px padding top/bottom so dots aren't clipped

    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = pad + ((1 - (v - min) / range) * (h - pad * 2));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return points.join(' ');
  }

  const primaryPoints = $derived(buildPath(values, width, height));
  const secondaryPoints = $derived(
    secondaryValues ? buildPath(secondaryValues, width, height) : ''
  );

  function lastPoint(points: string): { x: number; y: number } | null {
    if (!points) return null;
    const parts = points.split(' ');
    const last = parts[parts.length - 1].split(',');
    return { x: parseFloat(last[0]), y: parseFloat(last[1]) };
  }

  const dot = $derived(lastPoint(primaryPoints));
</script>

<svg {width} {height} viewBox="0 0 {width} {height}" fill="none" aria-hidden="true">
  {#if secondaryValues && secondaryPoints}
    <polyline
      points={secondaryPoints}
      stroke={secondaryColor}
      stroke-width="1.5"
      stroke-dasharray="4 2"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.8"
    />
  {/if}

  <polyline
    points={primaryPoints}
    stroke={color}
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.8"
  />

  {#if dot}
    <circle cx={dot.x} cy={dot.y} r="6" fill={color} opacity="0.2" />
    <circle cx={dot.x} cy={dot.y} r="3.5" fill={color} />
  {/if}
</svg>
```

- [ ] **Step 2: Verify type check passes**

```bash
cd app && npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/components/Sparkline.svelte
git commit -m "feat: add Sparkline SVG component"
```

---

### Task 7: MetricCard component

**Files:**
- Create: `app/src/lib/components/MetricCard.svelte`

- [ ] **Step 1: Create the component**

Create `app/src/lib/components/MetricCard.svelte`:

```svelte
<script lang="ts">
  import type { Component } from 'svelte';
  import Sparkline from './Sparkline.svelte';

  interface Props {
    label: string;
    icon: Component;
    href: string;
    primaryValue: string;
    primaryUnit?: string;
    secondaryValue?: string;
    secondaryUnit?: string;
    sparklineValues: number[];
    sparklineSecondaryValues?: number[];
  }

  let {
    label,
    icon: Icon,
    href,
    primaryValue,
    primaryUnit,
    secondaryValue,
    secondaryUnit,
    sparklineValues,
    sparklineSecondaryValues
  }: Props = $props();
</script>

<div
  class="flex flex-col gap-3 rounded-[20px] p-[18px_20px_16px]"
  style="background: var(--color-surface); border: 1px solid var(--color-border);"
>
  <!-- Header row -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <!-- Icon chip -->
      <div
        class="flex h-7 w-7 items-center justify-center rounded-lg"
        style="background: var(--color-accent-bg);"
      >
        <Icon size={14} style="color: var(--color-accent);" />
      </div>
      <span class="text-[13px] font-semibold" style="color: var(--color-text-primary);">
        {label}
      </span>
    </div>

    <!-- Add button -->
    <a
      {href}
      class="rounded-[20px] px-[14px] py-[5px] text-[12px] font-semibold text-white"
      style="background: var(--color-accent);"
      aria-label="Add {label} entry"
    >
      + Add
    </a>
  </div>

  <!-- Value + sparkline row -->
  <div class="flex items-end justify-between">
    <!-- Value display -->
    <div class="flex items-baseline gap-1">
      <span
        class="text-[38px] font-bold leading-none tracking-[-0.04em]"
        style="color: var(--color-text-primary);"
      >
        {primaryValue}
      </span>
      {#if primaryUnit}
        <span class="pb-1 text-[15px]" style="color: var(--color-text-muted);">{primaryUnit}</span>
      {/if}
      {#if secondaryValue}
        <span class="text-[22px] font-light tracking-[-0.02em]" style="color: var(--color-text-muted);">
          {secondaryValue}
        </span>
      {/if}
      {#if secondaryUnit}
        <span class="pb-1 text-[12px]" style="color: var(--color-text-muted);">{secondaryUnit}</span>
      {/if}
    </div>

    <!-- Sparkline -->
    <Sparkline
      values={sparklineValues}
      secondaryValues={sparklineSecondaryValues}
    />
  </div>
</div>
```

- [ ] **Step 2: Verify type check**

```bash
cd app && npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/components/MetricCard.svelte
git commit -m "feat: add MetricCard component"
```

---

### Task 8: Dashboard page with server load

**Files:**
- Create: `app/src/routes/dashboard/+page.server.ts`
- Create: `app/src/routes/dashboard/+page.svelte`

- [ ] **Step 1: Create the server load function**

Create `app/src/routes/dashboard/+page.server.ts`:

```typescript
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { metricEntries } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { MetricType } from '$lib/server/db/schema';

const METRIC_TYPES: MetricType[] = ['weight', 'blood_pressure', 'sleep', 'work'];
const SPARKLINE_LIMIT = 14;

async function loadMetricSummary(userId: string, metricType: MetricType) {
  const entries = await db
    .select()
    .from(metricEntries)
    .where(and(eq(metricEntries.userId, userId), eq(metricEntries.metricType, metricType)))
    .orderBy(desc(metricEntries.recordedAt))
    .limit(SPARKLINE_LIMIT);

  // Reverse so oldest→newest for sparkline rendering
  return entries.reverse();
}

export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent();

  const [weightEntries, bpEntries, sleepEntries, workEntries] = await Promise.all(
    METRIC_TYPES.map((type) => loadMetricSummary(user.id, type))
  );

  // Re-return user so PageData types include it and svelte-check passes
  return {
    user,
    weight: weightEntries,
    bloodPressure: bpEntries,
    sleep: sleepEntries,
    work: workEntries
  };
};
```

- [ ] **Step 2: Create the dashboard page**

Create `app/src/routes/dashboard/+page.svelte`:

```svelte
<script lang="ts">
  import { User, Droplets, Moon, Briefcase } from 'lucide-svelte';
  import MetricCard from '$lib/components/MetricCard.svelte';

  let { data } = $props();

  // Format duration (minutes) as "7h 22m"
  function formatDuration(minutes: number | undefined | null): { hours: string; mins: string } {
    if (!minutes) return { hours: '0', mins: '00' };
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return { hours: String(h), mins: String(m).padStart(2, '0') };
  }

  const latestWeight = $derived(data.weight.at(-1));
  const latestBP = $derived(data.bloodPressure.at(-1));
  const latestSleep = $derived(data.sleep.at(-1));
  const latestWork = $derived(data.work.at(-1));

  const sleepFormatted = $derived(formatDuration(latestSleep?.valueDuration));
  const workFormatted = $derived(formatDuration(latestWork?.valueDuration));

  const weightSparkline = $derived(
    data.weight.map((e) => e.valueNumeric ?? 0)
  );
  const bpSystolicSparkline = $derived(
    data.bloodPressure.map((e) => e.valueNumeric ?? 0)
  );
  const bpDiastolicSparkline = $derived(
    data.bloodPressure.map((e) => e.valueSecondary ?? 0)
  );
  const sleepSparkline = $derived(
    data.sleep.map((e) => e.valueDuration ?? 0)
  );
  const workSparkline = $derived(
    data.work.map((e) => e.valueDuration ?? 0)
  );

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = $derived(
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  );

  const dateLabel = $derived(
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  );
</script>

<div class="flex flex-col px-5 pb-6">
  <!-- Header -->
  <div class="px-1 pb-5 pt-3">
    <p class="mb-1 text-[13px]" style="color: var(--color-text-muted);">
      {greeting}, {data.user.name}
    </p>
    <h1
      class="text-[30px] font-bold leading-tight tracking-[-0.03em]"
      style="color: var(--color-text-primary);"
    >
      Your signals
    </h1>
    <div class="mt-2 flex items-center gap-1.5">
      <div class="h-2 w-2 rounded-full" style="background: var(--color-accent);"></div>
      <span class="text-[12px]" style="color: var(--color-text-muted);">{dateLabel}</span>
    </div>
  </div>

  <!-- Metric cards -->
  <div class="flex flex-col gap-2.5">
    <!-- Weight -->
    <MetricCard
      label="Weight"
      icon={User}
      href="/dashboard/weight"
      primaryValue={latestWeight?.valueNumeric?.toFixed(1) ?? '—'}
      primaryUnit="lbs"
      sparklineValues={weightSparkline}
    />

    <!-- Blood Pressure -->
    <MetricCard
      label="Blood Pressure"
      icon={Droplets}
      href="/dashboard/blood-pressure"
      primaryValue={latestBP?.valueNumeric?.toFixed(0) ?? '—'}
      secondaryValue={latestBP ? `/${latestBP.valueSecondary?.toFixed(0)}` : ''}
      secondaryUnit="mmHg"
      sparklineValues={bpSystolicSparkline}
      sparklineSecondaryValues={bpDiastolicSparkline}
    />

    <!-- Sleep -->
    <MetricCard
      label="Sleep"
      icon={Moon}
      href="/dashboard/sleep"
      primaryValue={sleepFormatted.hours}
      primaryUnit="h"
      secondaryValue={sleepFormatted.mins}
      secondaryUnit="m"
      sparklineValues={sleepSparkline}
    />

    <!-- Work -->
    <MetricCard
      label="Work"
      icon={Briefcase}
      href="/dashboard/work"
      primaryValue={workFormatted.hours}
      primaryUnit="h"
      secondaryValue={workFormatted.mins}
      secondaryUnit="m"
      sparklineValues={workSparkline}
    />
  </div>
</div>
```

- [ ] **Step 3: Run type check**

```bash
cd app && npm run check
```

Expected: 0 errors.

- [ ] **Step 4: Run the dev server and visually verify**

```bash
cd app && npm run dev
```

Open `http://localhost:5173` — should redirect to `/dashboard` and show all 4 metric cards with values and sparklines styled in warm cream/terracotta.

- [ ] **Step 5: Run e2e tests**

```bash
cd app && npm test
```

Expected: all 4 tests pass.

- [ ] **Step 6: Final lint + type check**

```bash
cd app && npm run lint && npm run check
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 7: Commit**

```bash
git add app/src/routes/dashboard/+page.server.ts app/src/routes/dashboard/+page.svelte
git commit -m "feat: build dashboard page with metric summary cards and sparklines"
```

---

## After All Chunks Complete

Open a PR:

```bash
gh pr create \
  --title "feat: SignalTrack dashboard — Warmth design" \
  --body "Implements the mobile dashboard with Design B (Warmth) styling.

## Summary
- Replaced placeholder DB schema with users + metric_entries tables
- Added Design B CSS tokens (warm cream, terracotta accent)
- Added DM Sans font
- Dashboard layout with bottom tab bar
- Sparkline SVG component
- MetricCard component
- Dashboard page with seeded data
- Auth stubbed (hardcoded dev user)

## Test plan
- [ ] \`npm run check\` passes
- [ ] \`npm run lint\` passes
- [ ] \`npm test\` — all e2e tests pass
- [ ] Visual verify: dashboard renders with warm cream background, terracotta cards, sparklines"
```
