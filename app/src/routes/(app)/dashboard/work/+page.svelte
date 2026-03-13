<script lang="ts">
	import { Briefcase } from 'lucide-svelte';
	import MetricDetailPage from '$lib/components/MetricDetailPage.svelte';
	import type { ChartPoint } from '$lib/components/MetricChart.svelte';
	import type { HistoryItem } from '$lib/components/MetricDetailPage.svelte';

	let { data, form } = $props();

	function formatDuration(minutes: number): string {
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m === 0 ? `${h}h` : `${h}h ${m}m`;
	}

	const chartPoints: ChartPoint[] = $derived(
		data.entries.map((e) => ({
			date: e.recordedAt,
			primary: e.valueDuration ?? 0
		}))
	);

	const historyItems: HistoryItem[] = $derived(
		data.entries
			.slice()
			.reverse()
			.map((e) => ({
				id: e.id,
				date: e.recordedAt,
				primaryDisplay: formatDuration(e.valueDuration ?? 0),
				unit: ''
			}))
	);

	const formatY = (v: number) => `${Math.round(v / 60)}h`;
</script>

<MetricDetailPage
	metric="work"
	title="Work"
	icon={Briefcase}
	range={data.range}
	{chartPoints}
	{historyItems}
	{form}
	{formatY}
/>
