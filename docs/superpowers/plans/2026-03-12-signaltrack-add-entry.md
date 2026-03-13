# Add Entry Sheet Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Add Entry bottom sheet so users can log weight, blood pressure, sleep, and work entries from the dashboard.

**Architecture:** A single `AddEntrySheet.svelte` component renders as a native `<dialog>` bottom sheet. The `+ Add` button on each metric card opens it pre-loaded for that metric. Form submission goes to a `?/addEntry` named action on the dashboard page; on success SvelteKit invalidates the dashboard load data, refreshing sparklines and values live.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), Drizzle ORM + better-sqlite3, Zod v4, Tailwind CSS 4, Playwright (e2e)

**Design spec:** `docs/superpowers/specs/2026-03-12-signaltrack-add-entry-design.md`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `app/src/lib/schemas/metrics.ts` | Zod validation schemas for all four metric types |
| Modify | `app/src/routes/(app)/dashboard/+page.server.ts` | Add `addEntry` named action |
| Create | `app/src/lib/components/AddEntrySheet.svelte` | Bottom sheet shell + per-metric forms |
| Modify | `app/src/lib/components/MetricCard.svelte` | Replace `href` + `<a>` with `onAdd` callback + `<button>` |
| Modify | `app/src/routes/(app)/dashboard/+page.svelte` | Add sheet state, pass `onAdd` to cards, render sheet |
| Create | `app/e2e/add-entry.spec.ts` | E2e tests for all four metric forms |

---

## Before Starting

```bash
git checkout -b feat/add-entry
```

---

## Chunk 1: Schemas + Server Action

### Task 1: Zod schemas

**Files:**
- Create: `app/src/lib/schemas/metrics.ts`

- [ ] **Step 1: Create the schemas file**

Create `app/src/lib/schemas/metrics.ts`:

```typescript
import { z } from 'zod';

export const weightSchema = z.object({
  metricType: z.literal('weight'),
  value: z.coerce
    .number({ invalid_type_error: 'Enter a valid number' })
    .positive('Weight must be positive'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required')
});

export const bloodPressureSchema = z.object({
  metricType: z.literal('blood_pressure'),
  systolic: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int()
    .min(1, 'Required'),
  diastolic: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int()
    .min(1, 'Required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required')
});

export const sleepSchema = z
  .object({
    metricType: z.literal('sleep'),
    bedDate: z.string().min(1, 'Required'),
    bedTime: z.string().min(1, 'Required'),
    wakeDate: z.string().min(1, 'Required'),
    wakeTime: z.string().min(1, 'Required')
  })
  .refine(
    (d) =>
      new Date(`${d.wakeDate}T${d.wakeTime}`) > new Date(`${d.bedDate}T${d.bedTime}`),
    { message: 'Wake time must be after bedtime', path: ['wakeTime'] }
  );

export const workSchema = z
  .object({
    metricType: z.literal('work'),
    workDate: z.string().min(1, 'Required'),
    startTime: z.string().min(1, 'Required'),
    endTime: z.string().min(1, 'Required')
  })
  .refine(
    (d) =>
      new Date(`${d.workDate}T${d.endTime}`) > new Date(`${d.workDate}T${d.startTime}`),
    { message: 'End time must be after start time', path: ['endTime'] }
  );

export type WeightData = z.infer<typeof weightSchema>;
export type BloodPressureData = z.infer<typeof bloodPressureSchema>;
export type SleepData = z.infer<typeof sleepSchema>;
export type WorkData = z.infer<typeof workSchema>;
```

- [ ] **Step 2: Verify type check passes**

```bash
cd app && npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/schemas/metrics.ts
git commit -m "feat: add Zod schemas for metric entry forms"
```

---

### Task 2: addEntry server action

**Files:**
- Modify: `app/src/routes/(app)/dashboard/+page.server.ts`

The existing file already has a `logout` action. Add `addEntry` to the same `actions` object. Also add the necessary imports.

- [ ] **Step 1: Write the failing e2e test first**

Create `app/e2e/add-entry.spec.ts` with just one test to drive the action:

```typescript
import { test, expect } from '@playwright/test';

const testPassword = 'password123';

async function registerAndGoToDashboard(page: import('@playwright/test').Page) {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Name').fill('Test User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/dashboard');
}

test('add weight entry updates dashboard', async ({ page }) => {
  await registerAndGoToDashboard(page);
  // Sheet doesn't exist yet — this test will fail until Tasks 3-4 are done
  // For now just verify the dashboard loads for a new user
  await expect(page.getByText('Your signals')).toBeVisible();
});
```

- [ ] **Step 2: Run test — confirm it passes (baseline)**

```bash
cd app && npm test -- --grep "add weight entry"
```

Expected: PASS (just verifies dashboard loads).

- [ ] **Step 3: Update the server file**

Modify `app/src/routes/(app)/dashboard/+page.server.ts`. Add these imports at the top alongside the existing ones:

```typescript
import { fail } from '@sveltejs/kit';
import {
  weightSchema,
  bloodPressureSchema,
  sleepSchema,
  workSchema
} from '$lib/schemas/metrics';
import type { NewMetricEntry } from '$lib/server/db/schema';
```

Then add the `addEntry` action inside the `actions` object (alongside `logout`):

```typescript
addEntry: async ({ request, locals }) => {
  if (!locals.user) redirect(302, '/login');

  const formData = await request.formData();
  // Note: date/time strings submitted by the browser (e.g. "2026-03-12T22:00") are
  // interpreted as local time by `new Date()` on the server. In production (Cloudflare
  // Workers, Node.js), the server timezone is UTC, so recordedAt will store the user's
  // typed datetime as if it were UTC. This is an intentional MVP simplification — no
  // timezone offset is submitted from the client.
  const metricType = formData.get('metricType') ?? '';
  const userId = locals.user.id;

  if (metricType === 'weight') {
    const result = weightSchema.safeParse({
      metricType,
      value: formData.get('value'),
      date: formData.get('date'),
      time: formData.get('time')
    });
    if (!result.success) {
      return fail(400, { metricType, errors: result.error.flatten().fieldErrors });
    }
    const recordedAt = new Date(`${result.data.date}T${result.data.time}`);
    await db.insert(metricEntries).values({
      userId,
      metricType: 'weight',
      valueNumeric: result.data.value,
      recordedAt
    } satisfies NewMetricEntry);
    return { success: true };
  }

  if (metricType === 'blood_pressure') {
    const result = bloodPressureSchema.safeParse({
      metricType,
      systolic: formData.get('systolic'),
      diastolic: formData.get('diastolic'),
      date: formData.get('date'),
      time: formData.get('time')
    });
    if (!result.success) {
      return fail(400, { metricType, errors: result.error.flatten().fieldErrors });
    }
    const recordedAt = new Date(`${result.data.date}T${result.data.time}`);
    await db.insert(metricEntries).values({
      userId,
      metricType: 'blood_pressure',
      valueNumeric: result.data.systolic,
      valueSecondary: result.data.diastolic,
      recordedAt
    } satisfies NewMetricEntry);
    return { success: true };
  }

  if (metricType === 'sleep') {
    const result = sleepSchema.safeParse({
      metricType,
      bedDate: formData.get('bedDate'),
      bedTime: formData.get('bedTime'),
      wakeDate: formData.get('wakeDate'),
      wakeTime: formData.get('wakeTime')
    });
    if (!result.success) {
      return fail(400, { metricType, errors: result.error.flatten().fieldErrors });
    }
    const bedDatetime = new Date(`${result.data.bedDate}T${result.data.bedTime}`);
    const wakeDatetime = new Date(`${result.data.wakeDate}T${result.data.wakeTime}`);
    const valueDuration = Math.round(
      (wakeDatetime.getTime() - bedDatetime.getTime()) / 60000
    );
    await db.insert(metricEntries).values({
      userId,
      metricType: 'sleep',
      valueDuration,
      recordedAt: bedDatetime
    } satisfies NewMetricEntry);
    return { success: true };
  }

  if (metricType === 'work') {
    const result = workSchema.safeParse({
      metricType,
      workDate: formData.get('workDate'),
      startTime: formData.get('startTime'),
      endTime: formData.get('endTime')
    });
    if (!result.success) {
      return fail(400, { metricType, errors: result.error.flatten().fieldErrors });
    }
    const startDatetime = new Date(`${result.data.workDate}T${result.data.startTime}`);
    const endDatetime = new Date(`${result.data.workDate}T${result.data.endTime}`);
    const valueDuration = Math.round(
      (endDatetime.getTime() - startDatetime.getTime()) / 60000
    );
    await db.insert(metricEntries).values({
      userId,
      metricType: 'work',
      valueDuration,
      recordedAt: startDatetime
    } satisfies NewMetricEntry);
    return { success: true };
  }

  return fail(400, { metricType: '', errors: { metricType: ['Unknown metric type'] } });
}
```

The final `actions` export in `+page.server.ts` should look like:

```typescript
export const actions: Actions = {
  logout: async ({ cookies }) => {
    // ... existing logout code unchanged ...
  },
  addEntry: async ({ request, locals }) => {
    // ... new code above ...
  }
};
```

- [ ] **Step 4: Verify type check passes**

```bash
cd app && npm run check
```

Expected: 0 errors. If `satisfies NewMetricEntry` causes issues (nullable fields), use a plain object cast instead: `as NewMetricEntry`.

- [ ] **Step 5: Commit**

```bash
git add app/src/routes/\(app\)/dashboard/+page.server.ts app/e2e/add-entry.spec.ts
git commit -m "feat: add addEntry server action for all four metric types"
```

---

## Chunk 2: AddEntrySheet Component

### Task 3: Create AddEntrySheet.svelte

**Files:**
- Create: `app/src/lib/components/AddEntrySheet.svelte`

This is the bottom sheet component. It uses a native `<dialog>` element and renders different form fields based on the `metric` prop.

- [ ] **Step 1: Create the file**

Create `app/src/lib/components/AddEntrySheet.svelte`:

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { MetricType } from '$lib/server/db/schema';

	// ActionData from the page includes both { success: true } and { metricType, errors }
	// shapes. We accept unknown here and narrow at the usage site.
	interface Props {
		metric: MetricType | null;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		actionForm?: Record<string, any> | null;
		onClose: () => void;
	}

	let { metric, actionForm, onClose }: Props = $props();

	let dialog = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (metric && dialog) {
			dialog.showModal();
		} else if (!metric && dialog) {
			dialog.close();
		}
	});

	// Only show errors if they belong to the currently open metric form.
	// Guard against the success shape { success: true } which has no errors.
	const errors = $derived<Record<string, string[]>>(
		actionForm?.metricType === metric && !actionForm?.success
			? (actionForm?.errors ?? {})
			: {}
	);

	// --- Default values ---
	function todayDate() {
		return new Date().toISOString().split('T')[0];
	}
	function yesterdayDate() {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		return d.toISOString().split('T')[0];
	}
	function currentTime() {
		const now = new Date();
		return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
	}

	// --- Work / Sleep reactive time state (for quick add chips + live duration) ---
	let workDate = $state(todayDate());
	let workStart = $state('09:00');
	let workEnd = $state('17:00');
	let sleepBedDate = $state(yesterdayDate());
	let sleepBedTime = $state('22:00');
	let sleepWakeDate = $state(todayDate());
	let sleepWakeTime = $state('06:00');

	function calcDurationLabel(startIso: string, endIso: string): string {
		const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
		if (diff <= 0) return '—';
		const totalMins = Math.round(diff / 60000);
		const h = Math.floor(totalMins / 60);
		const m = totalMins % 60;
		return m === 0 ? `${h}h` : `${h}h ${m}m`;
	}

	const workDuration = $derived(
		calcDurationLabel(`${workDate}T${workStart}`, `${workDate}T${workEnd}`)
	);
	const sleepDuration = $derived(
		calcDurationLabel(`${sleepBedDate}T${sleepBedTime}`, `${sleepWakeDate}T${sleepWakeTime}`)
	);

	function applyWorkPreset(hours: number) {
		const [h, m] = workStart.split(':').map(Number);
		const end = new Date();
		end.setHours(h + hours, m, 0, 0);
		// Note: if start + hours rolls past midnight (e.g. 22:00 + 4h = 02:00),
		// workEnd will be earlier than workStart on the same workDate. The server's
		// workSchema will reject this with "End time must be after start time".
		// This is an accepted limitation — work sessions crossing midnight are not supported.
		workEnd = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
	}

	const WORK_PRESETS = [4, 6, 8, 10];
	const SLEEP_PRESETS = [6, 7, 8, 9];

	function applySleepPreset(hours: number) {
		const [h, m] = sleepBedTime.split(':').map(Number);
		const wake = new Date(`${sleepBedDate}T${sleepBedTime}`);
		wake.setHours(h + hours, m, 0, 0);
		// Use local date methods (not toISOString which is UTC) to get the correct date
		const wakeYear = wake.getFullYear();
		const wakeMonth = String(wake.getMonth() + 1).padStart(2, '0');
		const wakeDay = String(wake.getDate()).padStart(2, '0');
		sleepWakeDate = `${wakeYear}-${wakeMonth}-${wakeDay}`;
		sleepWakeTime = `${String(wake.getHours()).padStart(2, '0')}:${String(wake.getMinutes()).padStart(2, '0')}`;
	}

	const titles: Record<string, string> = {
		weight: 'Weight',
		blood_pressure: 'Blood Pressure',
		sleep: 'Sleep',
		work: 'Log work hours'
	};
</script>

<!-- Backdrop click closes the sheet -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	onclose={onClose}
	onclick={(e) => {
		if (e.target === dialog) dialog?.close();
	}}
	class="m-0 mt-auto w-full max-w-none rounded-t-[24px] p-0 backdrop:bg-[rgba(44,26,14,0.4)]"
	style="background: var(--color-surface); max-height: 85dvh;"
>
	{#if metric}
		<form
			method="POST"
			action="?/addEntry"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						await update();
						onClose();
					} else {
						await update({ reset: false });
					}
				};
			}}
			class="flex flex-col gap-5 overflow-y-auto px-5 pb-8 pt-4"
			style="max-height: 85dvh;"
		>
			<!-- Drag handle -->
			<div class="flex justify-center pb-1">
				<div class="h-1 w-10 rounded-full" style="background: var(--color-border);"></div>
			</div>

			<!-- Header -->
			<div class="flex items-center justify-between">
				<div>
					<p class="text-[11px] font-semibold uppercase tracking-[0.08em]" style="color: var(--color-text-muted);">
						Log entry
					</p>
					<h2 class="text-[22px] font-bold tracking-[-0.02em]" style="color: var(--color-text-primary);">
						{titles[metric]}
					</h2>
				</div>
				<button
					type="button"
					onclick={() => dialog?.close()}
					class="flex h-8 w-8 items-center justify-center rounded-full text-[18px]"
					style="color: var(--color-text-muted); background: var(--color-accent-bg);"
					aria-label="Close"
				>
					×
				</button>
			</div>

			<!-- Hidden metric type field -->
			<input type="hidden" name="metricType" value={metric} />

			<!-- ===== WEIGHT FORM ===== -->
			{#if metric === 'weight'}
				<div class="flex flex-col gap-1.5">
					<label for="weight-value" class="text-[13px] font-medium" style="color: var(--color-text-primary);">
						Weight
					</label>
					<div class="relative">
						<input
							id="weight-value"
							name="value"
							type="number"
							step="0.1"
							min="0"
							placeholder="0.0"
							class="w-full rounded-[10px] border px-4 py-3 text-[28px] font-bold outline-none focus:ring-2 focus:ring-[#C4622D]"
							style="border-color: {errors.value ? '#EF4444' : 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
						<span class="absolute right-4 top-1/2 -translate-y-1/2 text-[15px]" style="color: var(--color-text-muted);">
							lbs
						</span>
					</div>
					{#if errors.value}
						<p class="text-[12px]" style="color: #EF4444;">{errors.value[0]}</p>
					{/if}
					<p class="text-[12px]" style="color: var(--color-text-muted);">Enter your weight in pounds</p>
				</div>

				<div class="flex flex-col gap-1.5">
					<label class="text-[13px] font-medium" style="color: var(--color-text-primary);">Date & time</label>
					<div class="flex gap-2">
						<input
							name="date"
							type="date"
							value={todayDate()}
							class="flex-1 rounded-[10px] border px-3 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[#C4622D]"
							style="border-color: var(--color-border); background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
						<input
							name="time"
							type="time"
							value={currentTime()}
							class="flex-1 rounded-[10px] border px-3 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[#C4622D]"
							style="border-color: var(--color-border); background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
					</div>
				</div>

			<!-- ===== BLOOD PRESSURE FORM ===== -->
			{:else if metric === 'blood_pressure'}
				<div class="flex flex-col gap-1.5">
					<div class="flex items-end gap-2">
						<div class="flex flex-1 flex-col gap-1.5">
							<label for="bp-systolic" class="text-[13px] font-medium" style="color: var(--color-text-primary);">
								Systolic
							</label>
							<input
								id="bp-systolic"
								name="systolic"
								type="number"
								min="0"
								placeholder="120"
								class="w-full rounded-[10px] border px-4 py-3 text-[28px] font-bold outline-none focus:ring-2 focus:ring-[#C4622D]"
								style="border-color: {errors.systolic ? '#EF4444' : 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
							/>
							{#if errors.systolic}
								<p class="text-[12px]" style="color: #EF4444;">{errors.systolic[0]}</p>
							{/if}
						</div>
						<span class="mb-3 text-[24px] font-light" style="color: var(--color-text-muted);">/</span>
						<div class="flex flex-1 flex-col gap-1.5">
							<label for="bp-diastolic" class="text-[13px] font-medium" style="color: var(--color-text-primary);">
								Diastolic
							</label>
							<input
								id="bp-diastolic"
								name="diastolic"
								type="number"
								min="0"
								placeholder="80"
								class="w-full rounded-[10px] border px-4 py-3 text-[28px] font-bold outline-none focus:ring-2 focus:ring-[#C4622D]"
								style="border-color: {errors.diastolic ? '#EF4444' : 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
							/>
							{#if errors.diastolic}
								<p class="text-[12px]" style="color: #EF4444;">{errors.diastolic[0]}</p>
							{/if}
						</div>
					</div>
					<p class="text-[12px]" style="color: var(--color-text-muted);">Both values in mmHg</p>
				</div>

				<div class="flex flex-col gap-1.5">
					<label class="text-[13px] font-medium" style="color: var(--color-text-primary);">Date & time</label>
					<div class="flex gap-2">
						<input
							name="date"
							type="date"
							value={todayDate()}
							class="flex-1 rounded-[10px] border px-3 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[#C4622D]"
							style="border-color: var(--color-border); background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
						<input
							name="time"
							type="time"
							value={currentTime()}
							class="flex-1 rounded-[10px] border px-3 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[#C4622D]"
							style="border-color: var(--color-border); background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
					</div>
				</div>

			<!-- ===== SLEEP FORM ===== -->
			{:else if metric === 'sleep'}
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center justify-between">
						<label class="text-[13px] font-medium" style="color: var(--color-text-primary);">Duration</label>
						{#if sleepDuration !== '—'}
							<span class="text-[13px]" style="color: var(--color-accent);">{sleepDuration}</span>
						{/if}
					</div>
					<div class="grid grid-cols-2 gap-2">
						<div class="flex flex-col gap-1">
							<p class="text-[11px]" style="color: var(--color-text-muted);">Bedtime</p>
							<input
								name="bedDate"
								type="date"
								bind:value={sleepBedDate}
								class="rounded-[10px] border px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#C4622D]"
								style="border-color: var(--color-border); background: var(--color-accent-bg); color: var(--color-text-primary);"
							/>
							<input
								name="bedTime"
								type="time"
								bind:value={sleepBedTime}
								class="rounded-[10px] border px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#C4622D]"
								style="border-color: var(--color-border); background: var(--color-accent-bg); color: var(--color-text-primary);"
							/>
						</div>
						<div class="flex flex-col gap-1">
							<p class="text-[11px]" style="color: var(--color-text-muted);">Wake time</p>
							<input
								name="wakeDate"
								type="date"
								bind:value={sleepWakeDate}
								class="rounded-[10px] border px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#C4622D]"
								style="border-color: {errors.wakeTime ? '#EF4444' : 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
							/>
							<input
								name="wakeTime"
								type="time"
								bind:value={sleepWakeTime}
								class="rounded-[10px] border px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#C4622D]"
								style="border-color: {errors.wakeTime ? '#EF4444' : 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
							/>
						</div>
					</div>
					{#if errors.wakeTime}
						<p class="text-[12px]" style="color: #EF4444;">{errors.wakeTime[0]}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<p class="text-[11px] font-semibold uppercase tracking-[0.06em]" style="color: var(--color-text-muted);">
						Quick add
					</p>
					<div class="flex gap-2">
						{#each SLEEP_PRESETS as hours}
							<button
								type="button"
								onclick={() => applySleepPreset(hours)}
								class="rounded-full border px-4 py-1.5 text-[13px] font-medium"
								style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
							>
								{hours}h
							</button>
						{/each}
					</div>
				</div>

			<!-- ===== WORK FORM ===== -->
			{:else if metric === 'work'}
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center justify-between">
						<label class="text-[13px] font-medium" style="color: var(--color-text-primary);">Duration</label>
						{#if workDuration !== '—'}
							<span class="text-[13px]" style="color: var(--color-accent);">{workDuration}</span>
						{/if}
					</div>
					<input
						name="workDate"
						type="date"
						bind:value={workDate}
						class="rounded-[10px] border px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#C4622D]"
						style="border-color: var(--color-border); background: var(--color-accent-bg); color: var(--color-text-primary);"
					/>
					<div class="flex items-center gap-2">
						<input
							name="startTime"
							type="time"
							bind:value={workStart}
							class="flex-1 rounded-[10px] border px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#C4622D]"
							style="border-color: var(--color-border); background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
						<span style="color: var(--color-text-muted);">→</span>
						<input
							name="endTime"
							type="time"
							bind:value={workEnd}
							class="flex-1 rounded-[10px] border px-3 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[#C4622D]"
							style="border-color: {errors.endTime ? '#EF4444' : 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
					</div>
					{#if errors.endTime}
						<p class="text-[12px]" style="color: #EF4444;">{errors.endTime[0]}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<p class="text-[11px] font-semibold uppercase tracking-[0.06em]" style="color: var(--color-text-muted);">
						Quick add
					</p>
					<div class="flex gap-2">
						{#each WORK_PRESETS as hours}
							<button
								type="button"
								onclick={() => applyWorkPreset(hours)}
								class="rounded-full border px-4 py-1.5 text-[13px] font-medium"
								style="border-color: var(--color-border); color: var(--color-text-primary); background: var(--color-surface);"
							>
								{hours}h
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Save button -->
			<button
				type="submit"
				class="w-full rounded-[14px] py-4 text-[15px] font-semibold text-white"
				style="background: var(--color-accent);"
			>
				Save entry
			</button>
		</form>
	{/if}
</dialog>

<style>
	dialog::backdrop {
		background: rgba(44, 26, 14, 0.4);
	}

	dialog[open] {
		animation: slide-up 300ms ease-out;
	}

	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
```

- [ ] **Step 2: Verify type check passes**

```bash
cd app && npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/components/AddEntrySheet.svelte
git commit -m "feat: add AddEntrySheet bottom sheet component"
```

---

## Chunk 3: Dashboard Wiring + Tests

### Task 4: Wire up MetricCard and dashboard page

**Files:**
- Modify: `app/src/lib/components/MetricCard.svelte`
- Modify: `app/src/routes/(app)/dashboard/+page.svelte`

#### 4a — MetricCard: replace href + `<a>` with onAdd + `<button>`

- [ ] **Step 1: Update dashboard.spec.ts to use `button` role**

In `app/e2e/dashboard.spec.ts`, the "dashboard shows all 4 metric cards" test currently uses `getByRole('link', ...)` for the + Add buttons. After this task changes `<a>` to `<button>`, those assertions will fail. Update them now:

```typescript
// OLD
await expect(page.getByRole('link', { name: 'Add Weight entry' })).toBeVisible();
await expect(page.getByRole('link', { name: 'Add Blood Pressure entry' })).toBeVisible();
await expect(page.getByRole('link', { name: 'Add Sleep entry' })).toBeVisible();
await expect(page.getByRole('link', { name: 'Add Work entry' })).toBeVisible();

// NEW
await expect(page.getByRole('button', { name: 'Add Weight entry' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Add Blood Pressure entry' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Add Sleep entry' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Add Work entry' })).toBeVisible();
```

- [ ] **Step 2: Update MetricCard.svelte**

In `app/src/lib/components/MetricCard.svelte`, make these changes:

1. Replace `href: string` with `onAdd: () => void` in the `Props` interface
2. Remove `href` from the destructured props
3. Add `onAdd` to the destructured props
4. Change the `<a {href} ...>+ Add</a>` to `<button type="button" onclick={onAdd} ...>+ Add</button>`

The updated relevant sections:

```svelte
<script lang="ts">
  // ...existing imports...

  interface Props {
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: Component<any> | ComponentType<any>;
    onAdd: () => void;  // ← was: href: string
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
    onAdd,  // ← was: href
    primaryValue,
    // ...rest unchanged
  }: Props = $props();
</script>
```

And in the template, change:
```svelte
<!-- OLD -->
<a
  {href}
  class="rounded-[20px] px-[14px] py-[5px] text-[12px] font-semibold text-white"
  style="background: var(--color-accent);"
  aria-label="Add {label} entry"
>
  + Add
</a>

<!-- NEW -->
<button
  type="button"
  onclick={onAdd}
  class="rounded-[20px] px-[14px] py-[5px] text-[12px] font-semibold text-white"
  style="background: var(--color-accent);"
  aria-label="Add {label} entry"
>
  + Add
</button>
```

#### 4b — Dashboard page: add sheet state and render sheet

- [ ] **Step 3: Update +page.svelte**

In `app/src/routes/(app)/dashboard/+page.svelte`, make these changes:

1. Add import for `AddEntrySheet` and `MetricType`
2. Add `form` to the destructured props
3. Add `openMetric` state
4. Replace `href=` props on MetricCards with `onAdd=` callbacks
5. Render `<AddEntrySheet>` at the bottom

The updated script section:

```svelte
<script lang="ts">
  import { User, Droplets, Moon, Briefcase } from 'lucide-svelte';
  import MetricCard from '$lib/components/MetricCard.svelte';
  import AddEntrySheet from '$lib/components/AddEntrySheet.svelte';
  import type { MetricType } from '$lib/server/db/schema';

  let { data, form } = $props();

  let openMetric = $state<MetricType | null>(null);

  // ...existing formatDuration, derived values, greeting, dateLabel unchanged...
</script>
```

Then in the template, replace all four `<MetricCard>` calls' `href=` with `onAdd=`:

```svelte
<!-- Weight -->
<MetricCard
  label="Weight"
  icon={User}
  onAdd={() => (openMetric = 'weight')}
  primaryValue={latestWeight?.valueNumeric?.toFixed(1) ?? '—'}
  primaryUnit="lbs"
  sparklineValues={weightSparkline}
/>

<!-- Blood Pressure -->
<MetricCard
  label="Blood Pressure"
  icon={Droplets}
  onAdd={() => (openMetric = 'blood_pressure')}
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
  onAdd={() => (openMetric = 'sleep')}
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
  onAdd={() => (openMetric = 'work')}
  primaryValue={workFormatted.hours}
  primaryUnit="h"
  secondaryValue={workFormatted.mins}
  secondaryUnit="m"
  sparklineValues={workSparkline}
/>
```

Add `<AddEntrySheet>` at the very bottom of the template (outside the flex container, as a sibling to it):

```svelte
<AddEntrySheet
  metric={openMetric}
  actionForm={form}
  onClose={() => (openMetric = null)}
/>
```

- [ ] **Step 4: Verify type check passes**

```bash
cd app && npm run check
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/components/MetricCard.svelte app/src/routes/\(app\)/dashboard/+page.svelte app/e2e/dashboard.spec.ts
git commit -m "feat: wire up AddEntrySheet to dashboard — replace href with onAdd callbacks"
```

---

### Task 5: E2e tests

**Files:**
- Modify: `app/e2e/add-entry.spec.ts`

Replace the placeholder test from Task 2 with the full test suite.

- [ ] **Step 1: Write the full test suite**

Replace `app/e2e/add-entry.spec.ts` with:

```typescript
import { test, expect } from '@playwright/test';

const testPassword = 'password123';

async function registerAndGoToDashboard(page: import('@playwright/test').Page) {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Name').fill('Test User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/dashboard');
}

test('add weight entry updates dashboard', async ({ page }) => {
  await registerAndGoToDashboard(page);

  // Open sheet
  await page.getByRole('button', { name: 'Add Weight entry' }).click();
  await expect(page.getByRole('heading', { name: 'Weight' })).toBeVisible();

  // Fill form
  await page.getByLabel('Weight').fill('185.5');

  // Submit
  await page.getByRole('button', { name: 'Save entry' }).click();

  // Sheet closes and dashboard updates
  await expect(page.getByRole('heading', { name: 'Weight' })).not.toBeVisible();
  await expect(page.getByText('185.5')).toBeVisible();
});

test('add blood pressure entry updates dashboard', async ({ page }) => {
  await registerAndGoToDashboard(page);

  await page.getByRole('button', { name: 'Add Blood Pressure entry' }).click();
  await expect(page.getByRole('heading', { name: 'Blood Pressure' })).toBeVisible();

  await page.getByLabel('Systolic').fill('120');
  await page.getByLabel('Diastolic').fill('80');
  await page.getByRole('button', { name: 'Save entry' }).click();

  await expect(page.getByRole('heading', { name: 'Blood Pressure' })).not.toBeVisible();
  await expect(page.getByText('120')).toBeVisible();
});

test('add sleep entry updates dashboard', async ({ page }) => {
  await registerAndGoToDashboard(page);

  await page.getByRole('button', { name: 'Add Sleep entry' }).click();
  await expect(page.getByRole('heading', { name: 'Sleep' })).toBeVisible();

  // Submit with defaults (10pm → 6am = 8h)
  await page.getByRole('button', { name: 'Save entry' }).click();

  await expect(page.getByRole('heading', { name: 'Sleep' })).not.toBeVisible();
  // Verify the dashboard sleep card updated with the new duration
  await expect(page.getByText('8h')).toBeVisible();
});

test('add work entry using quick add preset', async ({ page }) => {
  await registerAndGoToDashboard(page);

  await page.getByRole('button', { name: 'Add Work entry' }).click();
  await expect(page.getByRole('heading', { name: 'Log work hours' })).toBeVisible();

  // Use 8h quick add preset (scoped to dialog to avoid matching other buttons)
  await page.getByRole('dialog').getByRole('button', { name: '8h' }).click();
  await page.getByRole('button', { name: 'Save entry' }).click();

  await expect(page.getByRole('heading', { name: 'Log work hours' })).not.toBeVisible();
});

test('weight validation shows error for empty value', async ({ page }) => {
  await registerAndGoToDashboard(page);

  await page.getByRole('button', { name: 'Add Weight entry' }).click();
  // Submit without filling value
  await page.getByRole('button', { name: 'Save entry' }).click();

  // Error message visible, sheet stays open
  await expect(page.getByRole('heading', { name: 'Weight' })).toBeVisible();
});

test('closing sheet with X button works', async ({ page }) => {
  await registerAndGoToDashboard(page);

  await page.getByRole('button', { name: 'Add Weight entry' }).click();
  await expect(page.getByRole('heading', { name: 'Weight' })).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { name: 'Weight' })).not.toBeVisible();
});
```

- [ ] **Step 2: Run all tests**

```bash
cd app && npm test
```

Expected: all tests pass (existing 11 + new 6 = 17 total). If the dashboard update test fails because the sparkline doesn't immediately show the new value, check that `invalidateAll` is firing correctly in the `use:enhance` callback.

- [ ] **Step 3: Run lint**

```bash
cd app && npm run lint
```

Expected: no errors. Run `npx prettier --write .` if formatting issues found.

- [ ] **Step 4: Commit**

```bash
git add app/e2e/add-entry.spec.ts
git commit -m "test: add e2e tests for add entry sheet"
```

---

## After All Chunks Complete

```bash
gh pr create \
  --title "feat: add entry bottom sheet for all four metrics" \
  --body "$(cat <<'EOF'
## Summary
- Zod schemas for weight, blood pressure, sleep, and work entries
- addEntry named action on dashboard page validates and inserts metric_entries
- AddEntrySheet bottom sheet component with native <dialog>, slide-up animation
- MetricCard + Add button opens sheet pre-loaded for that metric
- Sleep/work calculate duration from start→end times; dashboard refreshes live on save
- Quick add presets (4h/6h/8h/10h for work, 6h/7h/8h/9h for sleep)

## Test plan
- [ ] `npm run check` — 0 errors
- [ ] `npm run lint` — clean
- [ ] `npm test` — all 17 tests pass
- [ ] Manual: tap + Add on each card, verify correct form fields appear
- [ ] Manual: add a weight entry, verify dashboard value + sparkline update live
- [ ] Manual: use work quick add 8h preset, verify end time updates
- [ ] Manual: submit empty weight form, verify error appears and sheet stays open
- [ ] Manual: close sheet with X and backdrop tap
EOF
)"
```
