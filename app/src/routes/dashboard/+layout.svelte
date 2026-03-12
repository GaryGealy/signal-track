<script lang="ts">
	import { page } from '$app/state';
	import { LayoutGrid, User, Droplets, Moon, Briefcase } from 'lucide-svelte';

	let { children } = $props();

	const tabs = [
		{ label: 'Home', icon: LayoutGrid, href: '/dashboard' },
		{ label: 'Wt', icon: User, href: '/dashboard/weight' },
		{ label: 'BP', icon: Droplets, href: '/dashboard/blood-pressure' },
		{ label: 'Slp', icon: Moon, href: '/dashboard/sleep' },
		{ label: 'Wrk', icon: Briefcase, href: '/dashboard/work' }
	];
</script>

<div class="flex h-dvh flex-col" style="background: var(--color-bg);">
	<!-- Scrollable content -->
	<main class="min-h-0 flex-1 overflow-y-auto">
		{@render children()}
	</main>

	<!-- Bottom tab bar -->
	<nav
		aria-label="Main navigation"
		class="flex shrink-0 items-center pb-7"
		style="background: var(--color-surface); border-top: 1px solid var(--color-border);"
	>
		{#each tabs as tab (tab.href)}
			{@const isActive = page.url.pathname === tab.href}
			<a
				href={tab.href}
				class="flex flex-1 flex-col items-center gap-1 pt-3"
				aria-current={isActive ? 'page' : undefined}
			>
				<tab.icon
					size={22}
					style="color: {isActive ? 'var(--color-accent)' : 'var(--color-text-muted)'};"
				/>
				<span
					class="text-[10px]"
					style="
            color: {isActive ? 'var(--color-accent)' : 'var(--color-text-muted)'};
            font-weight: {isActive ? '600' : '500'};
          "
				>
					{tab.label}
				</span>
			</a>
		{/each}
	</nav>
</div>
