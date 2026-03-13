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
		actionForm?.metricType === metric && !actionForm?.success ? (actionForm?.errors ?? {}) : {}
	);

	// --- Default values ---
	function todayDate() {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}
	function yesterdayDate() {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}
	function currentTime() {
		const now = new Date();
		return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
	}

	// --- Weight / BP date-time state (captured at open time, not hard-coded to render time) ---
	let weightDate = $state(todayDate());
	let weightTime = $state(currentTime());
	let bpDate = $state(todayDate());
	let bpTime = $state(currentTime());

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
					<p
						class="text-[11px] font-semibold uppercase tracking-[0.08em]"
						style="color: var(--color-text-muted);"
					>
						Log entry
					</p>
					<h2
						class="text-[22px] font-bold tracking-[-0.02em]"
						style="color: var(--color-text-primary);"
					>
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
					<label
						for="weight-value"
						class="text-[13px] font-medium"
						style="color: var(--color-text-primary);"
					>
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
							style="border-color: {errors.value
								? '#EF4444'
								: 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
						<span
							class="absolute right-4 top-1/2 -translate-y-1/2 text-[15px]"
							style="color: var(--color-text-muted);"
						>
							lbs
						</span>
					</div>
					{#if errors.value}
						<p class="text-[12px]" style="color: #EF4444;">{errors.value[0]}</p>
					{/if}
					<p class="text-[12px]" style="color: var(--color-text-muted);">
						Enter your weight in pounds
					</p>
				</div>

				<div class="flex flex-col gap-1.5">
					<p class="text-[13px] font-medium" style="color: var(--color-text-primary);">
						Date & time
					</p>
					<div class="flex gap-2">
						<input
							name="date"
							type="date"
							bind:value={weightDate}
							class="flex-1 rounded-[10px] border px-3 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[#C4622D]"
							style="border-color: var(--color-border); background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
						<input
							name="time"
							type="time"
							bind:value={weightTime}
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
							<label
								for="bp-systolic"
								class="text-[13px] font-medium"
								style="color: var(--color-text-primary);"
							>
								Systolic
							</label>
							<input
								id="bp-systolic"
								name="systolic"
								type="number"
								min="0"
								placeholder="120"
								class="w-full rounded-[10px] border px-4 py-3 text-[28px] font-bold outline-none focus:ring-2 focus:ring-[#C4622D]"
								style="border-color: {errors.systolic
									? '#EF4444'
									: 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
							/>
							{#if errors.systolic}
								<p class="text-[12px]" style="color: #EF4444;">{errors.systolic[0]}</p>
							{/if}
						</div>
						<span class="mb-3 text-[24px] font-light" style="color: var(--color-text-muted);"
							>/</span
						>
						<div class="flex flex-1 flex-col gap-1.5">
							<label
								for="bp-diastolic"
								class="text-[13px] font-medium"
								style="color: var(--color-text-primary);"
							>
								Diastolic
							</label>
							<input
								id="bp-diastolic"
								name="diastolic"
								type="number"
								min="0"
								placeholder="80"
								class="w-full rounded-[10px] border px-4 py-3 text-[28px] font-bold outline-none focus:ring-2 focus:ring-[#C4622D]"
								style="border-color: {errors.diastolic
									? '#EF4444'
									: 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
							/>
							{#if errors.diastolic}
								<p class="text-[12px]" style="color: #EF4444;">{errors.diastolic[0]}</p>
							{/if}
						</div>
					</div>
					<p class="text-[12px]" style="color: var(--color-text-muted);">Both values in mmHg</p>
				</div>

				<div class="flex flex-col gap-1.5">
					<p class="text-[13px] font-medium" style="color: var(--color-text-primary);">
						Date & time
					</p>
					<div class="flex gap-2">
						<input
							name="date"
							type="date"
							bind:value={bpDate}
							class="flex-1 rounded-[10px] border px-3 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[#C4622D]"
							style="border-color: var(--color-border); background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
						<input
							name="time"
							type="time"
							bind:value={bpTime}
							class="flex-1 rounded-[10px] border px-3 py-3 text-[14px] outline-none focus:ring-2 focus:ring-[#C4622D]"
							style="border-color: var(--color-border); background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
					</div>
				</div>

				<!-- ===== SLEEP FORM ===== -->
			{:else if metric === 'sleep'}
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center justify-between">
						<p class="text-[13px] font-medium" style="color: var(--color-text-primary);">
							Duration
						</p>
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
								style="border-color: {errors.wakeTime
									? '#EF4444'
									: 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
							/>
							<input
								name="wakeTime"
								type="time"
								bind:value={sleepWakeTime}
								class="rounded-[10px] border px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#C4622D]"
								style="border-color: {errors.wakeTime
									? '#EF4444'
									: 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
							/>
						</div>
					</div>
					{#if errors.wakeTime}
						<p class="text-[12px]" style="color: #EF4444;">{errors.wakeTime[0]}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<p
						class="text-[11px] font-semibold uppercase tracking-[0.06em]"
						style="color: var(--color-text-muted);"
					>
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
						<p class="text-[13px] font-medium" style="color: var(--color-text-primary);">
							Duration
						</p>
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
							style="border-color: {errors.endTime
								? '#EF4444'
								: 'var(--color-border)'}; background: var(--color-accent-bg); color: var(--color-text-primary);"
						/>
					</div>
					{#if errors.endTime}
						<p class="text-[12px]" style="color: #EF4444;">{errors.endTime[0]}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<p
						class="text-[11px] font-semibold uppercase tracking-[0.06em]"
						style="color: var(--color-text-muted);"
					>
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
