<script lang="ts">
	import type { Component, ComponentType } from 'svelte';
	import { enhance } from '$app/forms';
	import { Trash2 } from 'lucide-svelte';
	import AddEntrySheet from './AddEntrySheet.svelte';
	import MetricChart from './MetricChart.svelte';
	import TimeRangePicker from './TimeRangePicker.svelte';
	import type { MetricType } from '$lib/server/db/schema';
	import type { ChartPoint } from './MetricChart.svelte';

	export interface HistoryItem {
		id: string;
		date: Date;
		primaryDisplay: string;
		unit: string;
	}

	interface Props {
		metric: MetricType;
		title: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: Component<any> | ComponentType<any>;
		range: string;
		chartPoints: ChartPoint[];
		historyItems: HistoryItem[];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form?: Record<string, any> | null;
		formatY?: (v: number) => string;
	}

	let {
		metric,
		title,
		icon: Icon,
		range,
		chartPoints,
		historyItems,
		form,
		formatY
	}: Props = $props();

	let showSheet = $state(false);
</script>

<div class="flex flex-col px-5 pb-6 pt-4">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-[10px]"
				style="background: var(--color-accent-bg);"
			>
				<Icon size={16} style="color: var(--color-accent);" />
			</div>
			<h1
				class="text-[22px] font-bold tracking-[-0.02em]"
				style="color: var(--color-text-primary);"
			>
				{title}
			</h1>
		</div>
		<button
			type="button"
			onclick={() => (showSheet = true)}
			class="rounded-[20px] px-[14px] py-[6px] text-[12px] font-semibold text-white"
			style="background: var(--color-accent);"
			aria-label="Add {title} entry"
		>
			+ Add
		</button>
	</div>

	<!-- Time range picker -->
	<div class="mb-5">
		<TimeRangePicker current={range} />
	</div>

	<!-- Chart area -->
	<div
		class="mb-5 rounded-[16px] p-4"
		style="background: var(--color-surface); border: 1px solid var(--color-border);"
	>
		{#if chartPoints.length >= 2}
			<MetricChart points={chartPoints} {formatY} />
		{:else if chartPoints.length === 1}
			<!-- One entry — not enough for a trend line -->
			<div class="flex flex-col items-center justify-center gap-2 py-8">
				<p class="text-[14px] font-medium" style="color: var(--color-text-primary);">
					Add one more entry to see your trend.
				</p>
				<p class="text-[12px]" style="color: var(--color-text-muted);">
					You need at least 2 data points for a chart.
				</p>
			</div>
		{:else}
			<!-- Empty state (design spec §8) -->
			<div class="flex flex-col items-center justify-center gap-3 py-10">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-[12px]"
					style="background: var(--color-accent-bg);"
				>
					<Icon size={20} style="color: var(--color-accent);" />
				</div>
				<div class="text-center">
					<p class="text-[16px] font-semibold" style="color: var(--color-text-primary);">
						No entries yet.
					</p>
					<p class="mt-1 text-[13px]" style="color: var(--color-text-muted);">
						Add your first reading to see your trend.
					</p>
				</div>
				<button
					type="button"
					onclick={() => (showSheet = true)}
					class="rounded-[20px] px-6 py-2 text-[13px] font-semibold text-white"
					style="background: var(--color-accent); max-width: 180px;"
				>
					+ Add entry
				</button>
			</div>
		{/if}
	</div>

	<!-- History list -->
	{#if historyItems.length > 0}
		<div>
			<p
				class="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
				style="color: var(--color-text-muted);"
			>
				History
			</p>
			<div
				class="rounded-[16px]"
				style="background: var(--color-surface); border: 1px solid var(--color-border);"
			>
				{#each historyItems as item, i (item.id)}
					<div
						class="flex items-center justify-between px-4 py-3"
						style={i < historyItems.length - 1
							? 'border-bottom: 1px solid var(--color-border);'
							: ''}
					>
						<p class="text-[13px]" style="color: var(--color-text-muted);">
							{item.date.toLocaleDateString('en-US', {
								weekday: 'short',
								month: 'short',
								day: 'numeric'
							})}
						</p>
						<div class="flex items-center gap-3">
							<span>
								<span class="text-[15px] font-semibold" style="color: var(--color-text-primary);">
									{item.primaryDisplay}
								</span>
								{#if item.unit}
									<span class="text-[12px]" style="color: var(--color-text-muted);">
										{item.unit}
									</span>
								{/if}
							</span>
							<form
								method="POST"
								action="?/deleteEntry"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											await update();
										} else {
											await update({ reset: false });
										}
									};
								}}
							>
								<input type="hidden" name="id" value={item.id} />
								<button
									type="submit"
									class="flex h-7 w-7 items-center justify-center rounded-full"
									style="color: var(--color-text-muted); background: var(--color-accent-bg);"
									aria-label="Delete entry"
								>
									<Trash2 size={13} />
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<AddEntrySheet
	metric={showSheet ? metric : null}
	actionForm={form}
	onClose={() => (showSheet = false)}
/>
