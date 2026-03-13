import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { loadMetricEntries, deleteMetricEntry } from '$lib/server/metrics';
import { workSchema } from '$lib/schemas/metrics';
import { db } from '$lib/server/db';
import { metricEntries } from '$lib/server/db/schema';
import type { NewMetricEntry } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ parent, url }) => {
	const { user } = await parent();
	const range = url.searchParams.get('range') ?? '30';
	const entries = await loadMetricEntries(user.id, 'work', range);
	return { entries, range };
};

export const actions: Actions = {
	addEntry: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const formData = await request.formData();
		const result = workSchema.safeParse({
			metricType: 'work',
			workDate: formData.get('workDate'),
			startTime: formData.get('startTime'),
			endTime: formData.get('endTime')
		});
		if (!result.success) {
			return fail(400, { metricType: 'work', errors: result.error.flatten().fieldErrors });
		}
		const startDatetime = new Date(`${result.data.workDate}T${result.data.startTime}`);
		const endDatetime = new Date(`${result.data.workDate}T${result.data.endTime}`);
		const valueDuration = Math.round((endDatetime.getTime() - startDatetime.getTime()) / 60000);
		await db.insert(metricEntries).values({
			userId: locals.user.id,
			metricType: 'work',
			valueDuration,
			recordedAt: startDatetime
		} satisfies NewMetricEntry);
		return { success: true };
	},

	deleteEntry: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { error: 'Missing entry id' });
		await deleteMetricEntry(id, locals.user.id);
		return { success: true };
	}
};
