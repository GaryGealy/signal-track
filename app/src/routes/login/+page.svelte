<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { z } from 'zod';

	let { data } = $props();

	let mode = $state<'login' | 'register'>('login');

	const loginSchema = z.object({
		email: z.string().email(),
		password: z.string().min(1)
	});

	const registerSchema = z.object({
		name: z.string().min(1),
		email: z.string().email(),
		password: z.string().min(8)
	});

	const {
		form: loginForm,
		errors: loginErrors,
		message: loginMessage,
		enhance: loginEnhance,
		submitting: loginSubmitting
	} = superForm(data.loginForm, {
		validators: zod4Client(loginSchema),
		invalidateAll: false
	});

	const {
		form: registerForm,
		errors: registerErrors,
		message: registerMessage,
		enhance: registerEnhance,
		submitting: registerSubmitting
	} = superForm(data.registerForm, {
		validators: zod4Client(registerSchema),
		invalidateAll: false
	});
</script>

<div
	class="flex min-h-dvh flex-col items-center justify-center px-5 py-10"
	style="background: var(--color-bg);"
>
	<div
		class="w-full max-w-[390px] rounded-[20px] p-8"
		style="background: var(--color-surface); border: 1px solid var(--color-border);"
	>
		<!-- Wordmark -->
		<div class="mb-6 text-center">
			<h1
				class="text-[22px] font-bold tracking-[-0.02em]"
				style="color: var(--color-text-primary);"
			>
				SignalTrack
			</h1>
			<p class="mt-1 text-[13px]" style="color: var(--color-text-muted);">
				Your signals, your story.
			</p>
		</div>

		{#if mode === 'login'}
			<form method="POST" action="?/login" use:loginEnhance class="flex flex-col gap-4">
				{#if $loginMessage}
					<p class="rounded-lg px-3 py-2 text-[13px]" style="background: #FEE2E2; color: #B91C1C;">
						{$loginMessage}
					</p>
				{/if}

				<div class="flex flex-col gap-1.5">
					<label
						for="login-email"
						class="text-[13px] font-medium"
						style="color: var(--color-text-primary);"
					>
						Email
					</label>
					<input
						id="login-email"
						name="email"
						type="email"
						autocomplete="email"
						bind:value={$loginForm.email}
						class="rounded-[10px] border px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#C4622D]"
						style="border-color: {$loginErrors.email
							? '#EF4444'
							: 'var(--color-border)'}; color: var(--color-text-primary); background: var(--color-surface);"
					/>
					{#if $loginErrors.email}
						<p class="text-[12px]" style="color: #EF4444;">{$loginErrors.email}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						for="login-password"
						class="text-[13px] font-medium"
						style="color: var(--color-text-primary);"
					>
						Password
					</label>
					<input
						id="login-password"
						name="password"
						type="password"
						autocomplete="current-password"
						bind:value={$loginForm.password}
						class="rounded-[10px] border px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#C4622D]"
						style="border-color: {$loginErrors.password
							? '#EF4444'
							: 'var(--color-border)'}; color: var(--color-text-primary); background: var(--color-surface);"
					/>
					{#if $loginErrors.password}
						<p class="text-[12px]" style="color: #EF4444;">{$loginErrors.password}</p>
					{/if}
				</div>

				<button
					type="submit"
					disabled={$loginSubmitting}
					class="mt-2 rounded-[14px] py-4 text-[15px] font-semibold text-white disabled:opacity-60"
					style="background: var(--color-accent);"
				>
					{$loginSubmitting ? 'Signing in…' : 'Sign in'}
				</button>
			</form>

			<p class="mt-5 text-center text-[13px]" style="color: var(--color-text-muted);">
				Don't have an account?
				<button
					onclick={() => (mode = 'register')}
					class="font-medium"
					style="color: var(--color-accent);"
				>
					Sign up
				</button>
			</p>
		{:else}
			<form method="POST" action="?/register" use:registerEnhance class="flex flex-col gap-4">
				{#if $registerMessage}
					<p class="rounded-lg px-3 py-2 text-[13px]" style="background: #FEE2E2; color: #B91C1C;">
						{$registerMessage}
					</p>
				{/if}

				<div class="flex flex-col gap-1.5">
					<label
						for="reg-name"
						class="text-[13px] font-medium"
						style="color: var(--color-text-primary);"
					>
						Name
					</label>
					<input
						id="reg-name"
						name="name"
						type="text"
						autocomplete="name"
						bind:value={$registerForm.name}
						class="rounded-[10px] border px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#C4622D]"
						style="border-color: {$registerErrors.name
							? '#EF4444'
							: 'var(--color-border)'}; color: var(--color-text-primary); background: var(--color-surface);"
					/>
					{#if $registerErrors.name}
						<p class="text-[12px]" style="color: #EF4444;">{$registerErrors.name}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						for="reg-email"
						class="text-[13px] font-medium"
						style="color: var(--color-text-primary);"
					>
						Email
					</label>
					<input
						id="reg-email"
						name="email"
						type="email"
						autocomplete="email"
						bind:value={$registerForm.email}
						class="rounded-[10px] border px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#C4622D]"
						style="border-color: {$registerErrors.email
							? '#EF4444'
							: 'var(--color-border)'}; color: var(--color-text-primary); background: var(--color-surface);"
					/>
					{#if $registerErrors.email}
						<p class="text-[12px]" style="color: #EF4444;">{$registerErrors.email}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<label
						for="reg-password"
						class="text-[13px] font-medium"
						style="color: var(--color-text-primary);"
					>
						Password
					</label>
					<input
						id="reg-password"
						name="password"
						type="password"
						autocomplete="new-password"
						bind:value={$registerForm.password}
						class="rounded-[10px] border px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#C4622D]"
						style="border-color: {$registerErrors.password
							? '#EF4444'
							: 'var(--color-border)'}; color: var(--color-text-primary); background: var(--color-surface);"
					/>
					{#if $registerErrors.password}
						<p class="text-[12px]" style="color: #EF4444;">{$registerErrors.password}</p>
					{/if}
				</div>

				<button
					type="submit"
					disabled={$registerSubmitting}
					class="mt-2 rounded-[14px] py-4 text-[15px] font-semibold text-white disabled:opacity-60"
					style="background: var(--color-accent);"
				>
					{$registerSubmitting ? 'Creating account…' : 'Create account'}
				</button>
			</form>

			<p class="mt-5 text-center text-[13px]" style="color: var(--color-text-muted);">
				Already have an account?
				<button
					onclick={() => (mode = 'login')}
					class="font-medium"
					style="color: var(--color-accent);"
				>
					Sign in
				</button>
			</p>
		{/if}
	</div>
</div>
