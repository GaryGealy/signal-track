<script lang="ts">
	interface Props {
		values: number[];
		width?: number;
		height?: number;
		color?: string;
		secondaryValues?: number[];
		secondaryColor?: string;
	}

	let {
		values,
		width = 96,
		height = 36,
		color = 'var(--color-accent)',
		secondaryValues,
		secondaryColor = '#E8A882'
	}: Props = $props();

	function buildPath(data: number[], w: number, h: number): string {
		if (data.length < 2) return '';
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;
		const pad = 4; // px padding top/bottom so dots aren't clipped

		const points = data.map((v, i) => {
			const x = (i / (data.length - 1)) * w;
			const y = pad + (1 - (v - min) / range) * (h - pad * 2);
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		});

		return points.join(' ');
	}

	const primaryPoints = $derived(buildPath(values, width, height));
	const secondaryPoints = $derived(
		secondaryValues ? buildPath(secondaryValues, width, height) : ''
	);

	function lastPoint(points: string): { x: number; y: number } | null {
		if (!points) return null;
		const parts = points.split(' ');
		const last = parts[parts.length - 1].split(',');
		return { x: parseFloat(last[0]), y: parseFloat(last[1]) };
	}

	const dot = $derived(lastPoint(primaryPoints));
</script>

<svg {width} {height} viewBox="0 0 {width} {height}" fill="none" aria-hidden="true">
	{#if secondaryValues && secondaryPoints}
		<polyline
			points={secondaryPoints}
			stroke={secondaryColor}
			stroke-width="1.5"
			stroke-dasharray="4 2"
			stroke-linecap="round"
			stroke-linejoin="round"
			opacity="0.8"
		/>
	{/if}

	<polyline
		points={primaryPoints}
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.8"
	/>

	{#if dot}
		<circle cx={dot.x} cy={dot.y} r="6" fill={color} opacity="0.2" />
		<circle cx={dot.x} cy={dot.y} r="3.5" fill={color} />
	{/if}
</svg>
