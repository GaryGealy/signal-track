<script lang="ts">
	interface Props {
		current: string;
	}

	let { current }: Props = $props();

	const ranges = [
		{ value: '7', label: '7d' },
		{ value: '30', label: '30d' },
		{ value: '90', label: '90d' },
		{ value: 'all', label: 'All' }
	];
</script>

<div
	class="flex gap-1 rounded-full p-1"
	style="background: var(--color-accent-bg);"
	role="group"
	aria-label="Time range"
>
	{#each ranges as range (range.value)}
		<a
			href="?range={range.value}"
			class="rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors"
			style={current === range.value
				? 'background: var(--color-accent); color: white;'
				: 'color: var(--color-text-muted);'}
			aria-current={current === range.value ? 'page' : undefined}
		>
			{range.label}
		</a>
	{/each}
</div>
