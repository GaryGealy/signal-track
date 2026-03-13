<script lang="ts">
	import {
		Scale,
		Droplets,
		Moon,
		Briefcase,
		ArrowRight,
		TrendingUp,
		ShieldCheck
	} from 'lucide-svelte';
</script>

<svelte:head>
	<title>SignalTrack — Your signals, your story.</title>
</svelte:head>

<div style="background: var(--color-bg); color: var(--color-text-primary);">
	<!-- Nav -->
	<header
		class="flex items-center justify-between px-6 py-4"
		style="border-bottom: 1px solid var(--color-border);"
	>
		<img src="/logo.png" alt="SignalTrack" class="h-8 w-auto" />
		<div class="flex items-center gap-4">
			<a href="/login" class="text-[14px] font-medium" style="color: var(--color-text-muted);">
				Sign in
			</a>
			<a
				href="/login"
				class="rounded-[12px] px-5 py-2.5 text-[14px] font-semibold text-white"
				style="background: var(--color-accent);"
			>
				Get started
			</a>
		</div>
	</header>

	<!-- Hero -->
	<section class="mx-auto max-w-2xl px-6 pb-20 pt-20 text-center">
		<p
			class="mb-4 inline-block rounded-full px-4 py-1.5 text-[12px] font-semibold uppercase tracking-widest"
			style="background: var(--color-accent-bg); color: var(--color-accent);"
		>
			Now in beta
		</p>
		<h1
			class="mb-5 text-[52px] font-bold leading-[1.08] tracking-[-0.03em]"
			style="color: var(--color-text-primary);"
		>
			Your signals,<br />your story.
		</h1>
		<p
			class="mx-auto mb-10 max-w-lg text-[18px] leading-relaxed"
			style="color: var(--color-text-muted);"
		>
			Most health apps want to be your entire lifestyle. SignalTrack just wants to show you the
			truth about yours.
		</p>
		<a
			href="/login"
			class="inline-flex items-center gap-2 rounded-[16px] px-8 py-4 text-[16px] font-semibold text-white"
			style="background: var(--color-accent);"
		>
			Start tracking free
			<ArrowRight size={18} />
		</a>
		<p class="mt-4 text-[13px]" style="color: var(--color-text-muted);">
			No credit card. No app to download.
		</p>
	</section>

	<!-- Four signals -->
	<section
		class="px-6 py-20"
		style="background: var(--color-surface); border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border);"
	>
		<div class="mx-auto max-w-3xl">
			<h2
				class="mb-3 text-center text-[32px] font-bold tracking-[-0.02em]"
				style="color: var(--color-text-primary);"
			>
				Four signals. One clear picture.
			</h2>
			<p class="mb-14 text-center text-[16px]" style="color: var(--color-text-muted);">
				Individually useful. Together, revealing.
			</p>

			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				{#each [{ icon: Scale, label: 'Weight', desc: "See the actual trend, not just today's number. Log daily and watch the direction that matters." }, { icon: Droplets, label: 'Blood Pressure', desc: 'Both readings, every time. Spot the pattern before your doctor has to.' }, { icon: Moon, label: 'Sleep', desc: "Hours in, hours out. Know what you're actually getting — not what you think you're getting." }, { icon: Briefcase, label: 'Work Hours', desc: "Burnout doesn't announce itself. Your data will." }] as metric (metric.label)}
					<div class="rounded-[20px] p-6" style="border: 1px solid var(--color-border);">
						<div
							class="mb-4 flex h-10 w-10 items-center justify-center rounded-[12px]"
							style="background: var(--color-accent-bg);"
						>
							<metric.icon size={20} style="color: var(--color-accent);" />
						</div>
						<h3 class="mb-2 text-[17px] font-semibold" style="color: var(--color-text-primary);">
							{metric.label}
						</h3>
						<p class="text-[14px] leading-relaxed" style="color: var(--color-text-muted);">
							{metric.desc}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How it works -->
	<section class="px-6 py-20">
		<div class="mx-auto max-w-2xl">
			<h2
				class="mb-3 text-center text-[32px] font-bold tracking-[-0.02em]"
				style="color: var(--color-text-primary);"
			>
				Ruthlessly simple to use.
			</h2>
			<p class="mb-14 text-center text-[16px]" style="color: var(--color-text-muted);">
				No onboarding. No tutorial. You'll figure it out in thirty seconds.
			</p>

			<div class="flex flex-col gap-8">
				{#each [{ n: '1', title: 'Log a reading', desc: 'Tap + Add on any metric card and enter your number. Takes five seconds.' }, { n: '2', title: 'See the trend', desc: 'Your dashboard shows every signal with a sparkline. Tap in for a full chart and your complete history.' }, { n: '3', title: 'Change the lens', desc: 'Switch between 7-day, 30-day, 90-day, and all-time views. Zoom in on a rough week. Zoom out to see the year.' }] as step (step.n)}
					<div class="flex items-start gap-5">
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white"
							style="background: var(--color-accent);"
						>
							{step.n}
						</div>
						<div>
							<h3 class="mb-1 text-[17px] font-semibold" style="color: var(--color-text-primary);">
								{step.title}
							</h3>
							<p class="text-[14px] leading-relaxed" style="color: var(--color-text-muted);">
								{step.desc}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Trust strip -->
	<section
		class="px-6 py-16"
		style="background: var(--color-surface); border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border);"
	>
		<div class="mx-auto grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3">
			{#each [{ icon: TrendingUp, title: 'Built for clarity', desc: 'Charts and trends that answer the question you actually have: is this getting better?' }, { icon: ShieldCheck, title: 'Your data. Full stop.', desc: 'No ads. No data brokers. No "insights" that are really upsells. Your health data goes nowhere.' }, { icon: ArrowRight, title: 'More coming fast', desc: 'Custom metrics, goals, wearable sync, and AI trend insights are all on the roadmap.' }] as item (item.title)}
				<div class="flex flex-col items-center gap-3 text-center">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-[12px]"
						style="background: var(--color-accent-bg);"
					>
						<item.icon size={20} style="color: var(--color-accent);" />
					</div>
					<h3 class="text-[15px] font-semibold" style="color: var(--color-text-primary);">
						{item.title}
					</h3>
					<p class="text-[13px] leading-relaxed" style="color: var(--color-text-muted);">
						{item.desc}
					</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- CTA -->
	<section class="px-6 py-24 text-center">
		<h2
			class="mb-4 text-[36px] font-bold tracking-[-0.02em]"
			style="color: var(--color-text-primary);"
		>
			Ready to see your signals?
		</h2>
		<p class="mb-10 text-[16px]" style="color: var(--color-text-muted);">
			Free to use. Nothing to install. Start logging in under a minute.
		</p>
		<a
			href="/login"
			class="inline-flex items-center gap-2 rounded-[16px] px-8 py-4 text-[16px] font-semibold text-white"
			style="background: var(--color-accent);"
		>
			Create your account
			<ArrowRight size={18} />
		</a>
	</section>

	<!-- Footer -->
	<footer
		class="px-6 py-8 text-center text-[13px]"
		style="border-top: 1px solid var(--color-border); color: var(--color-text-muted);"
	>
		© {new Date().getFullYear()} SignalTrack. Your signals, your story.
	</footer>
</div>
