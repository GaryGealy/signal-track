import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { validateSession, SESSION_COOKIE } from '$lib/server/auth';
import * as schema from '$lib/server/db/schema';

export const handle: Handle = async ({ event, resolve }) => {
	// In production (Cloudflare Pages) use D1 binding.
	// In local dev always use better-sqlite3 against local.db — the platform
	// proxy also provides a DB binding locally, but its D1 simulation hasn't
	// had migrations applied, so we skip it in dev mode.
	if (!dev && event.platform?.env?.DB) {
		const { drizzle } = await import('drizzle-orm/d1');
		event.locals.db = drizzle(event.platform.env.DB, { schema });
	} else {
		const { default: Database } = await import('better-sqlite3');
		const { drizzle } = await import('drizzle-orm/better-sqlite3');
		const client = new Database(process.env.DATABASE_URL ?? 'local.db');
		event.locals.db = drizzle(client, { schema });
	}

	// Validate session
	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const result = await validateSession(event.locals.db, token);
		if (result) {
			event.locals.user = result.user;
			event.locals.session = result.session;
		} else {
			event.locals.user = null;
			event.locals.session = null;
		}
	} else {
		event.locals.user = null;
		event.locals.session = null;
	}

	return resolve(event);
};
