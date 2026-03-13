import { redirect } from '@sveltejs/kit';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { metricEntries } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { MetricType } from '$lib/server/db/schema';

const METRIC_TYPES: MetricType[] = ['weight', 'blood_pressure', 'sleep', 'work'];
const SPARKLINE_LIMIT = 14;

async function loadMetricSummary(userId: string, metricType: MetricType) {
	const entries = await db
		.select()
		.from(metricEntries)
		.where(and(eq(metricEntries.userId, userId), eq(metricEntries.metricType, metricType)))
		.orderBy(desc(metricEntries.recordedAt))
		.limit(SPARKLINE_LIMIT);

	// Reverse so oldest→newest for sparkline rendering
	return entries.reverse();
}

export const actions: Actions = {
	logout: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) await deleteSession(token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(302, '/login');
	}
};

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	const [weightEntries, bpEntries, sleepEntries, workEntries] = await Promise.all(
		METRIC_TYPES.map((type) => loadMetricSummary(user.id, type))
	);

	// Re-return user so PageData types include it and svelte-check passes
	return {
		user,
		weight: weightEntries,
		bloodPressure: bpEntries,
		sleep: sleepEntries,
		work: workEntries
	};
};
