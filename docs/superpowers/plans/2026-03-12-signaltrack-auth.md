# SignalTrack Auth System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement session-based authentication (register, login, logout) and protect all dashboard routes so only authenticated users can access them.

**Architecture:** Session tokens stored in httpOnly cookies, validated on every request via `hooks.server.ts`. Auth utilities live in `src/lib/server/auth.ts`. Dashboard routes move into an `(app)` route group protected by a single layout guard. Login and register are handled as named SvelteKit form actions on a single `/login` page using Superforms + Zod.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), Drizzle ORM + better-sqlite3, bcryptjs, sveltekit-superforms v2, Zod v4, Playwright (e2e)

**Design spec:** `docs/superpowers/specs/2026-03-12-signaltrack-warmth-dashboard-design.md` (Section 7: Login Page)

**Auth note:** Cookie `secure` flag uses `!dev` from `$app/environment` so it works on HTTP localhost in development.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `app/src/lib/server/db/schema.ts` | Add `sessions` table |
| Modify | `app/src/app.d.ts` | Add `user` and `session` to `App.Locals` |
| Create | `app/src/lib/server/auth.ts` | Password hashing, session CRUD, cookie helpers |
| Create | `app/src/hooks.server.ts` | Session validation middleware (runs on every request) |
| Create | `app/src/routes/login/+page.server.ts` | Login + register form actions; redirect if already authed |
| Create | `app/src/routes/login/+page.svelte` | Login/register page UI (warmth design) |
| Create | `app/src/routes/(app)/+layout.server.ts` | Auth guard — redirect to `/login` if not authenticated |
| Move | `app/src/routes/dashboard/` → `app/src/routes/(app)/dashboard/` | Dashboard routes into protected group |
| Delete | `app/src/routes/(app)/dashboard/+layout.server.ts` | Stub no longer needed (auth at `(app)` parent level) |
| Create | `app/e2e/auth.spec.ts` | Auth e2e tests |

---

## Before Starting: Create a feature branch

```bash
git checkout -b feat/auth
```

---

## Chunk 1: Foundation (Sessions Table + Types + Auth Utilities)

### Task 1: Add sessions table to schema

**Files:**
- Modify: `app/src/lib/server/db/schema.ts`

- [ ] **Step 1: Add the sessions table**

Add to `app/src/lib/server/db/schema.ts` after the `users` table definition:

```typescript
export const sessions = sqliteTable('sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
```

The final schema.ts should look like:

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

export const sessions = sqliteTable('sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
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
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
```

- [ ] **Step 2: Apply the schema change**

```bash
cd app
DATABASE_URL=local.db npm run db:push
```

Expected: the `local.db` file is updated with the new `sessions` table.

- [ ] **Step 3: Verify type check passes**

```bash
cd app && npm run check
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/server/db/schema.ts
git commit -m "feat: add sessions table to schema"
```

---

### Task 2: Update App.Locals types

**Files:**
- Modify: `app/src/app.d.ts`

- [ ] **Step 1: Add user and session to App.Locals**

Replace the contents of `app/src/app.d.ts` with:

```typescript
import type { User, Session } from '$lib/server/db/schema';

declare global {
  namespace App {
    interface Locals {
      user: User | null;
      session: Session | null;
    }
  }
}

export {};
```

- [ ] **Step 2: Verify type check passes**

```bash
cd app && npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/app.d.ts
git commit -m "feat: add user and session to App.Locals"
```

---

### Task 3: Create auth utilities

**Files:**
- Create: `app/src/lib/server/auth.ts`

This file owns all auth logic: password hashing, session creation/validation/deletion, and the session cookie name constant.

- [ ] **Step 1: Create the file**

Create `app/src/lib/server/auth.ts`:

```typescript
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users, sessions } from './db/schema';
import { eq } from 'drizzle-orm';

export const SESSION_COOKIE = 'session_token';
const SESSION_TTL_DAYS = 30;
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const [session] = await db
    .insert(sessions)
    .values({ userId, expiresAt })
    .returning();

  if (!session) throw new Error('Failed to create session');
  return session.id;
}

export async function validateSession(token: string) {
  const result = await db
    .select()
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, token))
    .get();

  if (!result) return null;
  if (result.sessions.expiresAt < new Date()) {
    await deleteSession(token);
    return null;
  }

  return { user: result.users, session: result.sessions };
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, token));
}
```

- [ ] **Step 2: Verify type check passes**

```bash
cd app && npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/server/auth.ts
git commit -m "feat: add auth utilities (hash, session CRUD)"
```

---

## Chunk 2: Middleware + Login Page

### Task 4: Create session middleware

**Files:**
- Create: `app/src/hooks.server.ts`

This runs on every request. It reads the session cookie, validates it, and populates `event.locals` with the user and session (or null if not authenticated).

- [ ] **Step 1: Create the file**

Create `app/src/hooks.server.ts`:

```typescript
import type { Handle } from '@sveltejs/kit';
import { validateSession, SESSION_COOKIE } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(SESSION_COOKIE);

  if (token) {
    const result = await validateSession(token);
    if (result) {
      event.locals.user = result.user;
      event.locals.session = result.session;
    } else {
      event.locals.user = null;
      event.locals.session = null;
    }
  } else {
    event.locals.user = null;
    event.locals.session = null;
  }

  return resolve(event);
};
```

- [ ] **Step 2: Verify type check passes**

```bash
cd app && npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/hooks.server.ts
git commit -m "feat: add session validation middleware"
```

---

### Task 5: Login page

**Files:**
- Create: `app/src/routes/login/+page.server.ts`
- Create: `app/src/routes/login/+page.svelte`

A single page with two named actions (`login` and `register`) and a client-side toggle between the two forms. Uses Superforms + Zod for validation. Redirects to `/dashboard` if already authenticated.

- [ ] **Step 1: Write the e2e tests first**

Create `app/e2e/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

const testEmail = () => `test-${Date.now()}@example.com`;
const testPassword = 'password123';

test('unauthenticated visit to /dashboard redirects to /login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});

test('login page renders sign in form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'SignalTrack' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('register creates account and redirects to dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Name').fill('Test User');
  await page.getByLabel('Email').fill(testEmail());
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/dashboard');
});

test('login with valid credentials redirects to dashboard', async ({ page }) => {
  const email = testEmail();
  // Register first
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Name').fill('Test User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/dashboard');

  // Log out by navigating away and clearing cookies
  await page.context().clearCookies();

  // Log back in
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
});

test('login with wrong password shows error', async ({ page }) => {
  const email = testEmail();
  // Register first
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Name').fill('Test User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.context().clearCookies();

  // Try wrong password
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('wrongpassword');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid email or password')).toBeVisible();
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd app && npm test
```

Expected: the 4 new auth tests fail (routes don't exist yet). Existing 5 dashboard tests should still pass.

- [ ] **Step 3: Create the server file**

Create `app/src/routes/login/+page.server.ts`:

```typescript
import { redirect, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, createSession, SESSION_COOKIE } from '$lib/server/auth';
import { dev } from '$app/environment';
import type { PageServerLoad, Actions } from './$types';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !dev,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30
};

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) redirect(302, '/dashboard');

  const loginForm = await superValidate(zod4(loginSchema));
  const registerForm = await superValidate(zod4(registerSchema));

  return { loginForm, registerForm };
};

export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const form = await superValidate(request, zod4(loginSchema));
    if (!form.valid) return fail(400, { loginForm: form });

    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, form.data.email))
      .get();

    if (!user || !(await verifyPassword(form.data.password, user.passwordHash))) {
      form.message = 'Invalid email or password';
      return fail(401, { loginForm: form });
    }

    const token = await createSession(user.id);
    cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

    redirect(302, '/dashboard');
  },

  register: async ({ request, cookies }) => {
    const form = await superValidate(request, zod4(registerSchema));
    if (!form.valid) return fail(400, { registerForm: form });

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, form.data.email))
      .get();

    if (existing) {
      form.message = 'An account with this email already exists';
      return fail(409, { registerForm: form });
    }

    const passwordHash = await hashPassword(form.data.password);
    const [user] = await db
      .insert(users)
      .values({ email: form.data.email, passwordHash, name: form.data.name })
      .returning();

    const token = await createSession(user.id);
    cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

    redirect(302, '/dashboard');
  }
};
```

- [ ] **Step 4: Create the page UI**

Create `app/src/routes/login/+page.svelte`:

```svelte
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { zod4Client } from 'sveltekit-superforms/adapters';
  import { z } from 'zod';

  let { data } = $props();

  let mode = $state<'login' | 'register'>('login');

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  const registerSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8)
  });

  const {
    form: loginForm,
    errors: loginErrors,
    message: loginMessage,
    enhance: loginEnhance,
    submitting: loginSubmitting
  } = superForm(data.loginForm, {
    validators: zod4Client(loginSchema),
    invalidateAll: false
  });

  const {
    form: registerForm,
    errors: registerErrors,
    message: registerMessage,
    enhance: registerEnhance,
    submitting: registerSubmitting
  } = superForm(data.registerForm, {
    validators: zod4Client(registerSchema),
    invalidateAll: false
  });
</script>

<div
  class="flex min-h-dvh flex-col items-center justify-center px-5 py-10"
  style="background: var(--color-bg);"
>
  <div
    class="w-full max-w-[390px] rounded-[20px] p-8"
    style="background: var(--color-surface); border: 1px solid var(--color-border);"
  >
    <!-- Wordmark -->
    <div class="mb-6 text-center">
      <h1
        class="text-[22px] font-bold tracking-[-0.02em]"
        style="color: var(--color-text-primary);"
      >
        SignalTrack
      </h1>
      <p class="mt-1 text-[13px]" style="color: var(--color-text-muted);">
        Your signals, your story.
      </p>
    </div>

    {#if mode === 'login'}
      <!-- Login form -->
      <form method="POST" action="?/login" use:loginEnhance class="flex flex-col gap-4">
        {#if $loginMessage}
          <p class="rounded-lg px-3 py-2 text-[13px]" style="background: #FEE2E2; color: #B91C1C;">
            {$loginMessage}
          </p>
        {/if}

        <div class="flex flex-col gap-1.5">
          <label for="login-email" class="text-[13px] font-medium" style="color: var(--color-text-primary);">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autocomplete="email"
            bind:value={$loginForm.email}
            class="rounded-[10px] border px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#C4622D]"
            style="border-color: {$loginErrors.email ? '#EF4444' : 'var(--color-border)'}; color: var(--color-text-primary); background: var(--color-surface);"
          />
          {#if $loginErrors.email}
            <p class="text-[12px]" style="color: #EF4444;">{$loginErrors.email}</p>
          {/if}
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="login-password" class="text-[13px] font-medium" style="color: var(--color-text-primary);">
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autocomplete="current-password"
            bind:value={$loginForm.password}
            class="rounded-[10px] border px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#C4622D]"
            style="border-color: {$loginErrors.password ? '#EF4444' : 'var(--color-border)'}; color: var(--color-text-primary); background: var(--color-surface);"
          />
          {#if $loginErrors.password}
            <p class="text-[12px]" style="color: #EF4444;">{$loginErrors.password}</p>
          {/if}
        </div>

        <button
          type="submit"
          disabled={$loginSubmitting}
          class="mt-2 rounded-[14px] py-4 text-[15px] font-semibold text-white disabled:opacity-60"
          style="background: var(--color-accent);"
        >
          {$loginSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p class="mt-5 text-center text-[13px]" style="color: var(--color-text-muted);">
        Don't have an account?
        <button
          onclick={() => (mode = 'register')}
          class="font-medium"
          style="color: var(--color-accent);"
        >
          Sign up
        </button>
      </p>

    {:else}
      <!-- Register form -->
      <form method="POST" action="?/register" use:registerEnhance class="flex flex-col gap-4">
        {#if $registerMessage}
          <p class="rounded-lg px-3 py-2 text-[13px]" style="background: #FEE2E2; color: #B91C1C;">
            {$registerMessage}
          </p>
        {/if}

        <div class="flex flex-col gap-1.5">
          <label for="reg-name" class="text-[13px] font-medium" style="color: var(--color-text-primary);">
            Name
          </label>
          <input
            id="reg-name"
            name="name"
            type="text"
            autocomplete="name"
            bind:value={$registerForm.name}
            class="rounded-[10px] border px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#C4622D]"
            style="border-color: {$registerErrors.name ? '#EF4444' : 'var(--color-border)'}; color: var(--color-text-primary); background: var(--color-surface);"
          />
          {#if $registerErrors.name}
            <p class="text-[12px]" style="color: #EF4444;">{$registerErrors.name}</p>
          {/if}
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="reg-email" class="text-[13px] font-medium" style="color: var(--color-text-primary);">
            Email
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            autocomplete="email"
            bind:value={$registerForm.email}
            class="rounded-[10px] border px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#C4622D]"
            style="border-color: {$registerErrors.email ? '#EF4444' : 'var(--color-border)'}; color: var(--color-text-primary); background: var(--color-surface);"
          />
          {#if $registerErrors.email}
            <p class="text-[12px]" style="color: #EF4444;">{$registerErrors.email}</p>
          {/if}
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="reg-password" class="text-[13px] font-medium" style="color: var(--color-text-primary);">
            Password
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            autocomplete="new-password"
            bind:value={$registerForm.password}
            class="rounded-[10px] border px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#C4622D]"
            style="border-color: {$registerErrors.password ? '#EF4444' : 'var(--color-border)'}; color: var(--color-text-primary); background: var(--color-surface);"
          />
          {#if $registerErrors.password}
            <p class="text-[12px]" style="color: #EF4444;">{$registerErrors.password}</p>
          {/if}
        </div>

        <button
          type="submit"
          disabled={$registerSubmitting}
          class="mt-2 rounded-[14px] py-4 text-[15px] font-semibold text-white disabled:opacity-60"
          style="background: var(--color-accent);"
        >
          {$registerSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p class="mt-5 text-center text-[13px]" style="color: var(--color-text-muted);">
        Already have an account?
        <button
          onclick={() => (mode = 'login')}
          class="font-medium"
          style="color: var(--color-accent);"
        >
          Sign in
        </button>
      </p>
    {/if}
  </div>
</div>
```

- [ ] **Step 5: Verify type check passes**

```bash
cd app && npm run check
```

Expected: 0 errors. If `zod4Client` import fails, check that `sveltekit-superforms` version supports it:
```bash
node -e "const sf = require('sveltekit-superforms/adapters'); console.log(Object.keys(sf))"
```
If `zod4Client` is not available, use `zodClient` instead (and use `zod` instead of `zod4` on the server side too).

- [ ] **Step 6: Commit**

```bash
git add app/src/routes/login/ app/e2e/auth.spec.ts
git commit -m "feat: add login/register page with Superforms"
```

---

## Chunk 3: Protected Routes + Logout

### Task 6: Move dashboard into (app) route group with auth guard

**Files:**
- Create: `app/src/routes/(app)/+layout.server.ts`
- Move: `app/src/routes/dashboard/` → `app/src/routes/(app)/dashboard/`
- Delete: `app/src/routes/(app)/dashboard/+layout.server.ts` (was the auth stub)

The `(app)` route group is a SvelteKit parenthesized group — the parentheses mean it doesn't affect the URL path. `/dashboard` remains `/dashboard` in the browser.

- [ ] **Step 1: Create the auth guard layout**

Create `app/src/routes/(app)/+layout.server.ts`:

```typescript
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
  if (!locals.user) redirect(302, '/login');

  return { user: { id: locals.user.id, name: locals.user.name } };
};
```

- [ ] **Step 2: Move dashboard routes into the (app) group**

```bash
mkdir -p app/src/routes/\(app\)
mv app/src/routes/dashboard app/src/routes/\(app\)/dashboard
```

- [ ] **Step 3: Delete the now-redundant dashboard layout server file**

The `+layout.server.ts` in the dashboard folder was the auth stub. The `(app)` parent now handles auth and provides the user. Delete the stub:

```bash
rm app/src/routes/\(app\)/dashboard/+layout.server.ts
```

- [ ] **Step 4: Verify type check passes**

```bash
cd app && npm run check
```

Expected: 0 errors. If SvelteKit regenerated types correctly, the `parent()` call in `+page.server.ts` will now resolve the user from `(app)/+layout.server.ts`.

- [ ] **Step 5: Run all tests**

```bash
cd app && npm test
```

Expected: all 9 tests pass (5 dashboard + 4 auth). If the `unauthenticated /dashboard → /login` test fails, verify the route group is set up correctly and the auth guard is working.

- [ ] **Step 6: Commit**

```bash
git add app/src/routes/\(app\)/
git commit -m "feat: protect dashboard routes with auth guard via (app) route group"
```

---

### Task 7: Add logout

**Files:**
- Create: `app/src/routes/(app)/dashboard/+layout.svelte` — add logout button to tab bar

Wait — the dashboard layout (`+layout.svelte` with the tab bar) is now at `app/src/routes/(app)/dashboard/+layout.svelte`. Add a logout form action to it.

- [ ] **Step 1: Add logout action to dashboard layout server**

Create `app/src/routes/(app)/dashboard/+layout.server.ts`:

```typescript
import { redirect } from '@sveltejs/kit';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
  logout: async ({ cookies }) => {
    const token = cookies.get(SESSION_COOKIE);
    if (token) await deleteSession(token);
    cookies.delete(SESSION_COOKIE, { path: '/' });
    redirect(302, '/login');
  }
};
```

- [ ] **Step 2: Add logout button to the tab bar layout**

Modify `app/src/routes/(app)/dashboard/+layout.svelte` — add a small logout form above the tab bar or as a header action. Add this inside the `<div class="flex h-dvh flex-col">` wrapper, above `<main>`:

```svelte
<!-- Header with logout -->
<div
  class="flex shrink-0 items-center justify-end px-5 py-3"
  style="background: var(--color-bg);"
>
  <form method="POST" action="?/logout">
    <button
      type="submit"
      class="text-[12px]"
      style="color: var(--color-text-muted);"
    >
      Log out
    </button>
  </form>
</div>
```

- [ ] **Step 3: Add e2e test for logout**

Add to `app/e2e/auth.spec.ts`:

```typescript
test('logout clears session and redirects to login', async ({ page }) => {
  const email = testEmail();
  // Register and land on dashboard
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Name').fill('Test User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/dashboard');

  // Log out
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL('/login');

  // Verify session is gone
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});
```

- [ ] **Step 4: Run type check and all tests**

```bash
cd app && npm run check && npm test
```

Expected: 0 errors, all 10 tests pass.

- [ ] **Step 5: Final lint check**

```bash
cd app && npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/src/routes/\(app\)/dashboard/ app/e2e/auth.spec.ts
git commit -m "feat: add logout action to dashboard layout"
```

---

## After All Chunks Complete

Open a PR:

```bash
gh pr create \
  --title "feat: session-based auth (register, login, logout)" \
  --body "Implements full auth flow for SignalTrack.

## Summary
- Sessions table added to DB schema
- Auth utilities: bcrypt password hashing, session CRUD
- Session middleware in hooks.server.ts validates every request
- Login/register page at /login with Superforms + Zod
- Dashboard routes protected via (app) route group auth guard
- Logout action on dashboard clears session cookie

## Test plan
- [ ] \`npm run check\` passes
- [ ] \`npm run lint\` passes
- [ ] \`npm test\` — all 10 e2e tests pass
- [ ] Manual: register new account, verify redirect to dashboard
- [ ] Manual: log out, verify redirect to /login
- [ ] Manual: visit /dashboard without session, verify redirect to /login
- [ ] Manual: log back in with credentials, verify dashboard loads with real user data"
```
