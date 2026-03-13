import type { User, Session } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			db: any;
		}
		interface Platform {
			env: {
				DB: D1Database;
			};
		}
	}
}

export {};
