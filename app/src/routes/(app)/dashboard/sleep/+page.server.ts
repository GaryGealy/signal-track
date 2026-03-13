import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { loadMetricEntries, deleteMetricEntry } from '$lib/server/metrics';
import { sleepSchema } from '$lib/schemas/metrics';
import { metricEntries } from '$lib/server/db/schema';
import type { NewMetricEntry } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ parent, url, locals }) => {
	const { user } = await parent();
	const range = url.searchParams.get('range') ?? '30';
	const entries = await loadMetricEntries(locals.db, user.id, 'sleep', range);
	return { entries, range };
};

export const actions: Actions = {
	addEntry: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const formData = await request.formData();
		const result = sleepSchema.safeParse({
			metricType: 'sleep',
			bedDate: formData.get('bedDate'),
			bedTime: formData.get('bedTime'),
			wakeDate: formData.get('wakeDate'),
			wakeTime: formData.get('wakeTime')
		});
		if (!result.success) {
			return fail(400, { metricType: 'sleep', errors: result.error.flatten().fieldErrors });
		}
		const bedDatetime = new Date(`${result.data.bedDate}T${result.data.bedTime}`);
		const wakeDatetime = new Date(`${result.data.wakeDate}T${result.data.wakeTime}`);
		const valueDuration = Math.round((wakeDatetime.getTime() - bedDatetime.getTime()) / 60000);
		await locals.db.insert(metricEntries).values({
			userId: locals.user.id,
			metricType: 'sleep',
			valueDuration,
			recordedAt: bedDatetime
		} satisfies NewMetricEntry);
		return { success: true };
	},

	deleteEntry: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return fail(400, { error: 'Missing entry id' });
		await deleteMetricEntry(locals.db, id, locals.user.id);
		return { success: true };
	}
};
