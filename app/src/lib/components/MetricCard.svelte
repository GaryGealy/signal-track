<script lang="ts">
	import type { Component, ComponentType } from 'svelte';
	import Sparkline from './Sparkline.svelte';

	interface Props {
		label: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: Component<any> | ComponentType<any>;
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
				<span
					class="text-[22px] font-light tracking-[-0.02em]"
					style="color: var(--color-text-muted);"
				>
					{secondaryValue}
				</span>
			{/if}
			{#if secondaryUnit}
				<span class="pb-1 text-[12px]" style="color: var(--color-text-muted);">{secondaryUnit}</span
				>
			{/if}
		</div>

		<!-- Sparkline -->
		<Sparkline values={sparklineValues} secondaryValues={sparklineSecondaryValues} />
	</div>
</div>
