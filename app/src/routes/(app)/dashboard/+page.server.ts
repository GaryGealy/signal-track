import { redirect, fail } from '@sveltejs/kit';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { metricEntries } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { MetricType, NewMetricEntry } from '$lib/server/db/schema';
import { weightSchema, bloodPressureSchema, sleepSchema, workSchema } from '$lib/schemas/metrics';

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
	},
	addEntry: async ({ request, locals }) => {
		if (!locals.user) return redirect(302, '/login');

		const formData = await request.formData();
		// Note: date/time strings submitted by the browser (e.g. "2026-03-12T22:00") are
		// interpreted as local time by `new Date()` on the server. In production (Cloudflare
		// Workers, Node.js), the server timezone is UTC, so recordedAt will store the user's
		// typed datetime as if it were UTC. This is an intentional MVP simplification — no
		// timezone offset is submitted from the client.
		const metricType = formData.get('metricType') ?? '';
		const userId = locals.user.id;

		if (metricType === 'weight') {
			const result = weightSchema.safeParse({
				metricType,
				value: formData.get('value'),
				date: formData.get('date'),
				time: formData.get('time')
			});
			if (!result.success) {
				return fail(400, { metricType, errors: result.error.flatten().fieldErrors });
			}
			const recordedAt = new Date(`${result.data.date}T${result.data.time}`);
			await db.insert(metricEntries).values({
				userId,
				metricType: 'weight',
				valueNumeric: result.data.value,
				recordedAt
			} satisfies NewMetricEntry);
			return { success: true };
		}

		if (metricType === 'blood_pressure') {
			const result = bloodPressureSchema.safeParse({
				metricType,
				systolic: formData.get('systolic'),
				diastolic: formData.get('diastolic'),
				date: formData.get('date'),
				time: formData.get('time')
			});
			if (!result.success) {
				return fail(400, { metricType, errors: result.error.flatten().fieldErrors });
			}
			const recordedAt = new Date(`${result.data.date}T${result.data.time}`);
			await db.insert(metricEntries).values({
				userId,
				metricType: 'blood_pressure',
				valueNumeric: result.data.systolic,
				valueSecondary: result.data.diastolic,
				recordedAt
			} satisfies NewMetricEntry);
			return { success: true };
		}

		if (metricType === 'sleep') {
			const result = sleepSchema.safeParse({
				metricType,
				bedDate: formData.get('bedDate'),
				bedTime: formData.get('bedTime'),
				wakeDate: formData.get('wakeDate'),
				wakeTime: formData.get('wakeTime')
			});
			if (!result.success) {
				return fail(400, { metricType, errors: result.error.flatten().fieldErrors });
			}
			const bedDatetime = new Date(`${result.data.bedDate}T${result.data.bedTime}`);
			const wakeDatetime = new Date(`${result.data.wakeDate}T${result.data.wakeTime}`);
			const valueDuration = Math.round((wakeDatetime.getTime() - bedDatetime.getTime()) / 60000);
			await db.insert(metricEntries).values({
				userId,
				metricType: 'sleep',
				valueDuration,
				recordedAt: bedDatetime
			} satisfies NewMetricEntry);
			return { success: true };
		}

		if (metricType === 'work') {
			const result = workSchema.safeParse({
				metricType,
				workDate: formData.get('workDate'),
				startTime: formData.get('startTime'),
				endTime: formData.get('endTime')
			});
			if (!result.success) {
				return fail(400, { metricType, errors: result.error.flatten().fieldErrors });
			}
			const startDatetime = new Date(`${result.data.workDate}T${result.data.startTime}`);
			const endDatetime = new Date(`${result.data.workDate}T${result.data.endTime}`);
			const valueDuration = Math.round((endDatetime.getTime() - startDatetime.getTime()) / 60000);
			await db.insert(metricEntries).values({
				userId,
				metricType: 'work',
				valueDuration,
				recordedAt: startDatetime
			} satisfies NewMetricEntry);
			return { success: true };
		}

		return fail(400, { metricType: '', errors: { metricType: ['Unknown metric type'] } });
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
