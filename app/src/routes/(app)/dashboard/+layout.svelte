<script lang="ts">
	import { page } from '$app/state';
	import { LayoutGrid, User, Droplets, Moon, Briefcase } from 'lucide-svelte';

	let { children } = $props();

	const tabs = [
		{ label: 'Home', icon: LayoutGrid, href: '/dashboard' },
		{ label: 'Weight', icon: User, href: '/dashboard/weight' },
		{ label: 'BP', icon: Droplets, href: '/dashboard/blood-pressure' },
		{ label: 'Sleep', icon: Moon, href: '/dashboard/sleep' },
		{ label: 'Work', icon: Briefcase, href: '/dashboard/work' }
	];
</script>

<div class="flex h-dvh flex-col" style="background: var(--color-bg);">
	<!-- Header with logout -->
	<div
		class="flex shrink-0 items-center justify-end px-5 py-3"
		style="background: var(--color-bg);"
	>
		<form method="POST" action="/dashboard?/logout">
			<button type="submit" class="text-[12px]" style="color: var(--color-text-muted);">
				Log out
			</button>
		</form>
	</div>

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
