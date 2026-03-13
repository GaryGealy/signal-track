import { redirect, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, createSession, SESSION_COOKIE } from '$lib/server/auth';
import { dev } from '$app/environment';
import type { PageServerLoad, Actions } from './$types';

const loginSchema = z.object({
	email: z.string().email('Enter a valid email'),
	password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Enter a valid email'),
	password: z.string().min(8, 'Password must be at least 8 characters')
});

const SESSION_COOKIE_OPTIONS = {
	httpOnly: true,
	secure: !dev,
	sameSite: 'strict' as const,
	path: '/',
	maxAge: 60 * 60 * 24 * 30
};

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(302, '/dashboard');

	const loginForm = await superValidate(zod4(loginSchema));
	const registerForm = await superValidate(zod4(registerSchema));

	return { loginForm, registerForm };
};

export const actions: Actions = {
	login: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, zod4(loginSchema));
		if (!form.valid) return fail(400, { loginForm: form });

		const user = await locals.db.select().from(users).where(eq(users.email, form.data.email)).get();

		if (!user || !(await verifyPassword(form.data.password, user.passwordHash))) {
			form.message = 'Invalid email or password';
			return fail(401, { loginForm: form });
		}

		const token = await createSession(locals.db, user.id);
		cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

		redirect(302, '/dashboard');
	},

	register: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, zod4(registerSchema));
		if (!form.valid) return fail(400, { registerForm: form });

		const existing = await locals.db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, form.data.email))
			.get();

		if (existing) {
			form.message = 'An account with this email already exists';
			return fail(409, { registerForm: form });
		}

		const passwordHash = await hashPassword(form.data.password);
		const [user] = await locals.db
			.insert(users)
			.values({ email: form.data.email, passwordHash, name: form.data.name })
			.returning();

		const token = await createSession(locals.db, user.id);
		cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

		redirect(302, '/dashboard');
	}
};
