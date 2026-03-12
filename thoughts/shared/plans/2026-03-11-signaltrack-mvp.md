# SignalTrack MVP Implementation Plan

## Overview

Build the full SignalTrack MVP from the current scaffold — a mobile-first,
multi-tenant SaaS app for tracking weight, blood pressure, sleep, and work
hours over time. Deployed to Cloudflare Pages with D1 as the database.

## Current State Analysis

The app is a bare SvelteKit scaffold with:
- One placeholder route (`/`) with default welcome content
- One placeholder DB table (`task`) — to be replaced
- No auth, no routes, no server-side logic
- All needed libraries already installed: bcryptjs, superforms, formsnap,
  zod, shadcn-svelte components, Layerchart (to be added)
- Cloudflare D1 and adapter-cloudflare already configured in wrangler.toml

## Desired End State

A working MVP where a user can:
1. Register and log in with email/password
2. View a dashboard with summary cards (latest value + sparkline) for all 4 metrics
3. Tap "Add" on any card to log a new entry via a bottom sheet (mobile) or dialog (desktop)
4. Navigate to a metric detail page to see a full line chart + last 20 entries
5. Edit or delete any entry from the detail page
6. Log out

Verified by: app runs locally (`npm run dev`), all routes reachable, all
CRUD operations functional, type check and lint pass.

## Key Discoveries

- `app/src/lib/server/db/schema.ts` — currently defines only a `task` table; will be replaced entirely
- `app/src/lib/server/db/index.ts` — DB client uses `better-sqlite3` locally, D1 in production via wrangler binding
- `app/src/app.d.ts` — `App.Locals` is empty; needs `user` and `session` added for auth middleware
- `app/src/routes/+layout.svelte` — root layout is minimal; will be replaced with nav shell
- All shadcn-svelte components needed are already installed (Card, Dialog, Button, Input, Select, Separator, Skeleton)
- Layerchart needs to be added as a dependency

## What We're NOT Doing

- No notes on entries (v1 spec)
- No configurable weight units (lbs only)
- No CSV import/export
- No custom metrics
- No goals or alerts
- No wearable integrations
- No E2E tests
- No dark mode toggle (mode-watcher installed but not wired up)
- No register page UI (can use login page with toggle, or keep simple)

---

## Phase 1: Database Schema

> **Status: SUPERSEDED** — `users` and `metric_entries` tables are fully defined and implemented in the dashboard plan (`docs/superpowers/plans/2026-03-12-signaltrack-dashboard.md`, Task 1). Execute that plan first.
>
> **Remaining work for this phase:** Phase 2 (Auth) requires a `sessions` table that the dashboard plan does not include. Add it to the existing schema at the start of Phase 2 — see the note there.

### For reference: full intended schema

The dashboard plan creates `users` + `metric_entries`. The sessions table below is added in Phase 2.

```typescript
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

### Success Criteria (verify after dashboard plan completes)

- [ ] `npm run db:studio` shows `users` and `metric_entries` tables with correct columns
- [ ] Type check passes: `npm run check`

---

## Phase 2: Auth System

> **Prerequisites:** Dashboard plan complete. `users` and `metric_entries` tables exist in the schema.
>
> **First step of this phase:** Add the `sessions` table to `app/src/lib/server/db/schema.ts` (see Phase 1 for the definition), then run `npm run db:push` and `npm run db:generate`.

### Overview

Implement session-based authentication: register, login, logout. Session token
stored in an httpOnly, Secure, SameSite=Strict cookie. All auth logic in
`src/lib/server/auth.ts`. Route guard in root `+layout.server.ts`.

Move dashboard routes from `app/src/routes/dashboard/` into a `(app)` route group (`app/src/routes/(app)/dashboard/`) so the auth guard layout applies. Remove the stubbed auth from `+layout.server.ts` and replace with real session validation.

### Changes Required

#### 1. Auth utilities

**File**: `app/src/lib/server/auth.ts`
**Changes**: Create auth helpers for hashing, session creation/validation/deletion

```typescript
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users, sessions } from './db/schema';
import { eq } from 'drizzle-orm';

const SESSION_COOKIE = 'session_token';
const SESSION_TTL_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  const [session] = await db.insert(sessions).values({ userId, expiresAt }).returning();
  return session.id;
}

export async function validateSession(token: string) {
  const result = await db
    .select()
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, token))
    .get();
  if (!result || result.sessions.expiresAt < new Date()) return null;
  return result;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, token));
}

export { SESSION_COOKIE };
```

#### 2. Session middleware (root hooks)

**File**: `app/src/hooks.server.ts`
**Changes**: Create hooks file to validate session on every request, populate `locals`

```typescript
import type { Handle } from '@sveltejs/kit';
import { validateSession, SESSION_COOKIE } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(SESSION_COOKIE);
  if (token) {
    const result = await validateSession(token);
    if (result) {
      event.locals.user = result.users;
      event.locals.session = result.sessions;
    }
  }
  event.locals.user ??= null;
  event.locals.session ??= null;
  return resolve(event);
};
```

#### 3. Auth API endpoints

**File**: `app/src/routes/api/auth/register/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { hashPassword, createSession, SESSION_COOKIE } from '$lib/server/auth';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function POST({ request, cookies }) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: 'Invalid input' }, { status: 400 });

  const { email, password, name } = parsed.data;
  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return json({ error: 'Email already registered' }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email, passwordHash, name }).returning();
  const token = await createSession(user.id);

  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return json({ success: true });
}
```

**File**: `app/src/routes/api/auth/login/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSession, SESSION_COOKIE } from '$lib/server/auth';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST({ request, cookies }) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: 'Invalid input' }, { status: 400 });

  const { email, password } = parsed.data;
  const user = await db.select().from(users).where(eq(users.email, email)).get();
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const token = await createSession(user.id);
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return json({ success: true });
}
```

**File**: `app/src/routes/api/auth/logout/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';

export async function POST({ cookies }) {
  const token = cookies.get(SESSION_COOKIE);
  if (token) await deleteSession(token);
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return json({ success: true });
}
```

#### 4. Login page

**File**: `app/src/routes/login/+page.server.ts`
**Changes**: Redirect to dashboard if already authenticated

```typescript
import { redirect } from '@sveltejs/kit';

export function load({ locals }) {
  if (locals.user) redirect(302, '/dashboard');
}
```

**File**: `app/src/routes/login/+page.svelte`
**Changes**: Login + register form with tabs, email/password fields, Superforms

#### 5. Route guard

**File**: `app/src/routes/(app)/+layout.server.ts`
**Changes**: Protect all dashboard routes; redirect to `/login` if not authenticated

```typescript
import { redirect } from '@sveltejs/kit';

export function load({ locals }) {
  if (!locals.user) redirect(302, '/login');
  return { user: locals.user };
}
```

All dashboard routes will live under `app/src/routes/(app)/` route group.

### Success Criteria

#### Automated Verification
- [ ] Type check passes: `npm run check`
- [ ] Lint passes: `npm run lint`

#### Manual Verification
- [ ] Can register a new account and land on dashboard
- [ ] Can log in with correct credentials
- [ ] Wrong password returns an error message
- [ ] Logged-out user visiting `/dashboard` redirects to `/login`
- [ ] Logout deletes the session cookie and redirects to `/login`

---

## Phase 3: App Layout & Navigation

> **Prerequisites:** Phase 2 (Auth) complete. Routes are now under `(app)` route group with session guard.

### Overview

Extend the dashboard layout with full responsive navigation: the existing bottom tab bar (already built in the dashboard plan) gains a **desktop left sidebar** at `lg+`. Update `app/src/routes/(app)/+layout.svelte` to show the sidebar on desktop while keeping the bottom tab bar on mobile/tablet. Uses Tailwind breakpoints — `< lg` bottom tabs, `lg+` sidebar.

### Changes Required

#### 1. Install Layerchart

```bash
cd app
npm install layerchart
```

#### 2. Root layout (unauthenticated shell)

**File**: `app/src/routes/+layout.svelte`
**Changes**: Minimal shell — just renders children. No nav here (nav is inside the `(app)` group).

#### 3. Authenticated app layout

**File**: `app/src/routes/(app)/+layout.svelte`
**Changes**: Full nav shell with bottom tab bar (mobile) and sidebar (desktop)

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { LayoutDashboard, Weight, Heart, Moon, Briefcase } from '@lucide/svelte';

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/weight', label: 'Weight', icon: Weight },
    { href: '/dashboard/blood-pressure', label: 'Blood Pressure', icon: Heart },
    { href: '/dashboard/sleep', label: 'Sleep', icon: Moon },
    { href: '/dashboard/work', label: 'Work', icon: Briefcase },
  ];

  let { children, data } = $props();
</script>

<div class="flex h-screen">
  <!-- Sidebar (desktop lg+) -->
  <aside class="hidden lg:flex lg:w-64 lg:flex-col border-r p-4">
    <nav class="flex flex-col gap-1 mt-8">
      {#each navItems as item}
        <a
          href={item.href}
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                 {page.url.pathname === item.href
                   ? 'bg-primary text-primary-foreground'
                   : 'hover:bg-muted'}"
        >
          <item.icon size={18} />
          {item.label}
        </a>
      {/each}
    </nav>
    <div class="mt-auto">
      <form method="POST" action="/api/auth/logout">
        <button type="submit" class="text-sm text-muted-foreground hover:text-foreground">
          Log out
        </button>
      </form>
    </div>
  </aside>

  <!-- Main content -->
  <main class="flex-1 overflow-y-auto pb-20 lg:pb-0">
    {@render children()}
  </main>

  <!-- Bottom tab bar (mobile/tablet < lg) -->
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 border-t bg-background flex">
    {#each navItems as item}
      <a
        href={item.href}
        class="flex flex-1 flex-col items-center justify-center py-3 gap-1 text-xs
               min-h-[56px]
               {page.url.pathname === item.href
                 ? 'text-primary'
                 : 'text-muted-foreground'}"
      >
        <item.icon size={20} />
        <span class="truncate">{item.label}</span>
      </a>
    {/each}
  </nav>
</div>
```

### Success Criteria

#### Automated Verification
- [ ] Type check passes: `npm run check`
- [ ] Lint passes: `npm run lint`

#### Manual Verification
- [ ] Bottom tab bar visible on mobile, all 5 tabs present and tappable (44px+)
- [ ] Sidebar visible on desktop (≥1024px), bottom bar hidden
- [ ] Active route is highlighted in both nav variants
- [ ] Log out button works from sidebar

---

## Phase 4: Dashboard Page

> **Status: SUPERSEDED** — The dashboard page (`/dashboard`) with metric summary cards, sparklines, bottom tab bar, and seed data is fully implemented by the dashboard plan (`docs/superpowers/plans/2026-03-12-signaltrack-dashboard.md`).
>
> **Remaining work:** After Phase 2 wires real auth, update `MetricCard` to handle the empty state (no data) per the design spec (`docs/superpowers/specs/2026-03-12-signaltrack-warmth-dashboard-design.md`, Section 8). The card structure itself does not change.

### Empty state addition (post-auth only)

In `app/src/lib/components/MetricCard.svelte`, add a conditional in the value+sparkline row:

```svelte
{#if sparklineValues.length === 0}
  <!-- Empty state -->
  <div class="flex items-center gap-2 py-1">
    <Icon size={18} style="color: var(--color-text-muted);" />
    <span class="text-[13px]" style="color: var(--color-text-muted);">
      No entries yet. Add your first reading.
    </span>
  </div>
{:else}
  <!-- existing value + sparkline row -->
{/if}
```

### Success Criteria

- [ ] Dashboard renders with real user data after login
- [ ] Empty state shows on cards when no entries exist for that metric

### Changes Required

#### 1. Dashboard load function

**File**: `app/src/routes/(app)/dashboard/+page.server.ts`
**Changes**: Load latest entry + last 7 data points for each metric

```typescript
import { db } from '$lib/server/db';
import { metricEntries } from '$lib/server/db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

export async function load({ locals }) {
  const userId = locals.user!.id;
  const metrics = ['weight', 'blood_pressure', 'sleep', 'work'] as const;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const summaries = await Promise.all(
    metrics.map(async (type) => {
      const entries = await db
        .select()
        .from(metricEntries)
        .where(
          and(
            eq(metricEntries.userId, userId),
            eq(metricEntries.metricType, type),
            gte(metricEntries.recordedAt, sevenDaysAgo)
          )
        )
        .orderBy(desc(metricEntries.recordedAt))
        .limit(20);
      return { type, entries };
    })
  );

  return { summaries };
}
```

#### 2. MetricCard component

**File**: `app/src/lib/components/MetricCard.svelte`
**Changes**: Card with latest value, sparkline, Add button, empty state

Uses: Card, Button, Skeleton from shadcn-svelte; Layerchart for sparkline.

#### 3. Dashboard page

**File**: `app/src/routes/(app)/dashboard/+page.svelte`
**Changes**: Grid of 4 MetricCard components, pass data from load function

### Success Criteria

#### Automated Verification
- [ ] Type check passes: `npm run check`
- [ ] Lint passes: `npm run lint`

#### Manual Verification
- [ ] Dashboard loads with 4 cards
- [ ] Cards show "No entries yet" empty state when no data
- [ ] Cards show latest value and sparkline when data exists
- [ ] Add button is visible and tappable on each card

---

## Phase 5: Add Entry Modal

> **Prerequisites:** Phases 2–4 complete. Real auth in place, dashboard rendering with live user data.

### Overview

A single reusable modal component pre-loaded per metric type. Renders as a
bottom sheet on mobile and a centered dialog on desktop. Uses Superforms +
Formsnap + Zod for validation.

### Changes Required

#### 1. Metric form schemas

**File**: `app/src/lib/schemas/metrics.ts`
**Changes**: Zod schemas for each metric type

```typescript
import { z } from 'zod';

export const weightSchema = z.object({
  metricType: z.literal('weight'),
  valueNumeric: z.number().positive(),
  recordedAt: z.string().datetime(),
});

export const bloodPressureSchema = z.object({
  metricType: z.literal('blood_pressure'),
  valueNumeric: z.number().positive(),    // systolic
  valueSecondary: z.number().positive(),  // diastolic
  recordedAt: z.string().datetime(),
});

export const sleepSchema = z.object({
  metricType: z.literal('sleep'),
  valueDuration: z.number().int().positive(), // minutes
  recordedAt: z.string().datetime(),
});

export const workSchema = z.object({
  metricType: z.literal('work'),
  valueDuration: z.number().int().positive(), // minutes
  recordedAt: z.string().datetime(),
});
```

#### 2. Metrics API endpoint (POST)

**File**: `app/src/routes/api/metrics/+server.ts`
**Changes**: POST handler to create a metric entry

```typescript
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { metricEntries } from '$lib/server/db/schema';

export async function POST({ request, locals }) {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  // validate with zod union of all metric schemas
  const [entry] = await db
    .insert(metricEntries)
    .values({ ...body, userId: locals.user.id })
    .returning();
  return json(entry, { status: 201 });
}
```

#### 3. AddEntryModal component

**File**: `app/src/lib/components/AddEntryModal.svelte`
**Changes**: Dialog (desktop) / Sheet (mobile) containing the per-metric form.
Accepts `metricType` prop to pre-select the form.

On mobile (`< lg`): use a bottom sheet via CSS transform (slide up from bottom).
On desktop (`lg+`): use shadcn-svelte Dialog component.

Form fields per metric per UI spec:
- Weight: number input (lbs) + datetime
- Blood Pressure: systolic + diastolic number inputs + datetime
- Sleep/Work: hours + minutes inputs (converted to total minutes on submit) + datetime

### Success Criteria

#### Automated Verification
- [ ] Type check passes: `npm run check`
- [ ] Lint passes: `npm run lint`

#### Manual Verification
- [ ] Tapping Add on a dashboard card opens the modal pre-loaded for that metric
- [ ] On mobile: modal slides up from bottom
- [ ] On desktop: modal appears centered
- [ ] Submitting a valid entry closes the modal and refreshes the card data
- [ ] Validation errors show inline per field
- [ ] Blood pressure form shows two number fields

---

## Phase 6: Metric Detail Pages

> **Prerequisites:** Phase 5 complete. Add entry modal working end-to-end.

### Overview

Four detail pages (`/dashboard/weight`, `/dashboard/blood-pressure`,
`/dashboard/sleep`, `/dashboard/work`). Each has a date range selector,
full-width line chart, and a list of the last 20 entries with edit/delete.

### Changes Required

#### 1. Metrics API endpoints (GET, PUT, DELETE, summary)

**File**: `app/src/routes/api/metrics/+server.ts`
**Changes**: Add GET handler with `?type=` and `?range=` query params

**File**: `app/src/routes/api/metrics/[id]/+server.ts`
**Changes**: PUT (update entry) and DELETE (hard delete) handlers

**File**: `app/src/routes/api/metrics/summary/+server.ts`
**Changes**: GET with `?type=` and `?range=` — returns aggregated data:
- Weight: raw daily entries + 7-day rolling average
- Sleep/Work: raw entries + weekly totals

All queries filtered by `locals.user.id`.

#### 2. Detail page load functions

**File**: `app/src/routes/(app)/dashboard/[metric]/+page.server.ts`
**Changes**: Load entries for the metric based on range param (default 30d)

#### 3. Detail page component

**File**: `app/src/routes/(app)/dashboard/[metric]/+page.svelte`
**Changes**:
- Date range selector (7d / 30d / 90d / All) using shadcn Select
- Full-width Layerchart line chart (BP renders two lines)
- Rolling average overlay for weight
- Entries list (last 20) with Edit and Delete buttons per row
- Empty state with Add CTA when no data

#### 4. Edit entry

Inline edit: tapping Edit on a row opens the AddEntryModal pre-populated
with the entry's current values. On save, sends a PUT to `/api/metrics/:id`.

### Success Criteria

#### Automated Verification
- [ ] Type check passes: `npm run check`
- [ ] Lint passes: `npm run lint`

#### Manual Verification
- [ ] Date range selector changes the chart data
- [ ] Line chart renders correctly for each metric
- [ ] Blood pressure chart shows two lines (systolic + diastolic)
- [ ] Weight chart shows 7-day rolling average overlay
- [ ] Latest reading is highlighted on the chart
- [ ] Last 20 entries list is visible and scrollable
- [ ] Edit opens modal pre-populated with entry values, save updates the entry
- [ ] Delete removes the entry immediately (hard delete)
- [ ] Empty state shows when no entries exist for the selected range

---

## Testing Strategy

### Unit Tests

- Auth utilities: `hashPassword`, `verifyPassword`, `createSession`, `validateSession`, `deleteSession`
- Zod schemas: valid and invalid inputs for each metric type
- DB query helpers: ensure user_id filtering is always applied

### Manual Testing Steps

1. Register a new user, verify redirect to dashboard
2. Log in / log out cycle
3. Add one entry for each of the 4 metric types
4. Verify dashboard cards update with new values and sparklines
5. Navigate to each detail page, verify chart renders
6. Edit an entry, verify the change is reflected
7. Delete an entry, verify it disappears
8. Test on mobile viewport (375px) — bottom tabs, bottom sheet modal
9. Test on desktop viewport (1280px) — sidebar, dialog modal

---

## Performance Considerations

- Dashboard load queries 4 metrics in parallel (`Promise.all`)
- On-demand aggregation: SQL window functions for rolling average, GROUP BY for weekly totals
- Layerchart renders SVG — no canvas overhead, scales to container width naturally
- D1 composite index on `(user_id, metric_type, recorded_at)` covers all query patterns

---

## Migration Notes

- `npm run db:push` during development for rapid schema iteration
- `npm run db:generate` once schema is finalized to create the migration file
- `npm run db:migrate` to apply locally before committing
- Remote migration runs automatically via wrangler in the deploy pipeline

---

## References

- **Execute first:** `docs/superpowers/plans/2026-03-12-signaltrack-dashboard.md`
- Product spec: `thoughts/specs/SignalTrack_Product_Spec_v1.md`
- UI spec: `thoughts/specs/SignalTrack_UI_Spec_v1.md`
- Design spec (Warmth): `docs/superpowers/specs/2026-03-12-signaltrack-warmth-dashboard-design.md`
- DB schema: `app/src/lib/server/db/schema.ts`
- DB client: `app/src/lib/server/db/index.ts`
