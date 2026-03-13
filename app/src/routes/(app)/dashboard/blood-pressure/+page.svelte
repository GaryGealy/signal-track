<script lang="ts">
	import { Droplets } from 'lucide-svelte';
	import MetricDetailPage from '$lib/components/MetricDetailPage.svelte';
	import type { ChartPoint } from '$lib/components/MetricChart.svelte';
	import type { HistoryItem } from '$lib/components/MetricDetailPage.svelte';

	let { data, form } = $props();

	const chartPoints: ChartPoint[] = $derived(
		data.entries.map((e) => ({
			date: e.recordedAt,
			primary: e.valueNumeric ?? 0,
			secondary: e.valueSecondary ?? undefined
		}))
	);

	const historyItems: HistoryItem[] = $derived(
		data.entries
			.slice()
			.reverse()
			.map((e) => ({
				id: e.id,
				date: e.recordedAt,
				primaryDisplay: `${e.valueNumeric?.toFixed(0) ?? '—'}/${e.valueSecondary?.toFixed(0) ?? '—'}`,
				unit: 'mmHg'
			}))
	);
</script>

<MetricDetailPage
	metric="blood_pressure"
	title="Blood Pressure"
	icon={Droplets}
	range={data.range}
	{chartPoints}
	{historyItems}
	{form}
/>
