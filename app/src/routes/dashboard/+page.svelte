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

	const weightSparkline = $derived(data.weight.map((e) => e.valueNumeric ?? 0));
	const bpSystolicSparkline = $derived(data.bloodPressure.map((e) => e.valueNumeric ?? 0));
	const bpDiastolicSparkline = $derived(data.bloodPressure.map((e) => e.valueSecondary ?? 0));
	const sleepSparkline = $derived(data.sleep.map((e) => e.valueDuration ?? 0));
	const workSparkline = $derived(data.work.map((e) => e.valueDuration ?? 0));

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
