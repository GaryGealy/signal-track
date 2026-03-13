<script lang="ts">
	export interface ChartPoint {
		date: Date;
		primary: number;
		secondary?: number;
	}

	interface Props {
		points: ChartPoint[];
		color?: string;
		secondaryColor?: string;
		formatY?: (v: number) => string;
	}

	let {
		points,
		color = 'var(--color-accent)',
		secondaryColor = '#1e4475',
		formatY = (v: number) => String(Math.round(v))
	}: Props = $props();

	let containerWidth = $state(320);

	const PAD_LEFT = 44;
	const PAD_RIGHT = 12;
	const PAD_TOP = 12;
	const PAD_BOTTOM = 28;
	const CHART_H = 160;
	const SVG_H = CHART_H + PAD_TOP + PAD_BOTTOM;

	const chartW = $derived(containerWidth - PAD_LEFT - PAD_RIGHT);

	function scalePoints(values: number[], w: number): { x: number; y: number }[] {
		if (values.length < 2) return [];
		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min || 1;
		return values.map((v, i) => ({
			x: PAD_LEFT + (i / (values.length - 1)) * w,
			y: PAD_TOP + CHART_H - ((v - min) / range) * CHART_H
		}));
	}

	function toPolylineStr(pts: { x: number; y: number }[]): string {
		return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
	}

	const primaryValues = $derived(points.map((p) => p.primary));
	const hasSecondary = $derived(points.some((p) => p.secondary != null));
	const secondaryValues = $derived(points.map((p) => p.secondary ?? 0));

	// Use combined range for Y-axis so both lines share the same scale
	const allValues = $derived([...primaryValues, ...(hasSecondary ? secondaryValues : [])]);
	const yMin = $derived(allValues.length ? Math.min(...allValues) : 0);
	const yMax = $derived(allValues.length ? Math.max(...allValues) : 1);
	const yRange = $derived(yMax - yMin || 1);

	const primaryScaled = $derived(scalePoints(primaryValues, chartW));
	const secondaryScaled = $derived(hasSecondary ? scalePoints(secondaryValues, chartW) : []);
	const primaryStr = $derived(toPolylineStr(primaryScaled));
	const secondaryStr = $derived(toPolylineStr(secondaryScaled));

	const gridLines = $derived(
		[0, 1, 2, 3].map((i) => {
			const frac = i / 3;
			const value = yMin + frac * yRange;
			const y = PAD_TOP + CHART_H - frac * CHART_H;
			return { y, label: formatY(value) };
		})
	);

	const xLabels = $derived(() => {
		if (points.length === 0) return [];
		const count = Math.min(4, points.length);
		if (count === 1) {
			return [{ x: PAD_LEFT + chartW / 2, label: formatDate(points[0].date) }];
		}
		return Array.from({ length: count }, (_, i) => {
			const idx = Math.round((i / (count - 1)) * (points.length - 1));
			const x = PAD_LEFT + (idx / (points.length - 1)) * chartW;
			return { x, label: formatDate(points[idx].date) };
		});
	});

	function formatDate(d: Date): string {
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div bind:clientWidth={containerWidth} class="w-full">
	{#if points.length >= 2}
		<svg width={containerWidth} height={SVG_H} aria-hidden="true" class="overflow-visible">
			<!-- Gridlines + Y-axis labels -->
			{#each gridLines as line (line.y)}
				<line
					x1={PAD_LEFT}
					y1={line.y}
					x2={containerWidth - PAD_RIGHT}
					y2={line.y}
					stroke="var(--color-border)"
					stroke-width="1"
				/>
				<text
					x={PAD_LEFT - 6}
					y={line.y}
					text-anchor="end"
					dominant-baseline="middle"
					font-size="10"
					fill="var(--color-text-muted)">{line.label}</text
				>
			{/each}

			<!-- X-axis date labels -->
			{#each xLabels() as lbl (lbl.x)}
				<text
					x={lbl.x}
					y={PAD_TOP + CHART_H + 18}
					text-anchor="middle"
					font-size="10"
					fill="var(--color-text-muted)">{lbl.label}</text
				>
			{/each}

			<!-- Secondary line (BP diastolic) -->
			{#if hasSecondary && secondaryStr}
				<polyline
					points={secondaryStr}
					stroke={secondaryColor}
					stroke-width="2"
					stroke-dasharray="5 3"
					stroke-linecap="round"
					stroke-linejoin="round"
					fill="none"
					opacity="0.8"
				/>
			{/if}

			<!-- Primary line -->
			{#if primaryStr}
				<polyline
					points={primaryStr}
					stroke={color}
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					fill="none"
					opacity="0.9"
				/>
			{/if}

			<!-- Primary dots -->
			{#each primaryScaled as pt (pt.x)}
				<circle cx={pt.x} cy={pt.y} r="3" fill={color} />
			{/each}

			<!-- Secondary dots -->
			{#if hasSecondary}
				{#each secondaryScaled as pt (pt.x)}
					<circle cx={pt.x} cy={pt.y} r="2.5" fill={secondaryColor} opacity="0.8" />
				{/each}
			{/if}
		</svg>
	{/if}
</div>
