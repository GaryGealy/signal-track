import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { loadMetricEntries, deleteMetricEntry } from '$lib/server/metrics';
import { weightSchema } from '$lib/schemas/metrics';
import { metricEntries } from '$lib/server/db/schema';
import type { NewMetricEntry } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ parent, url, locals }) => {
	const { user } = await parent();
	const range = url.searchParams.get('range') ?? '30';
	const entries = await loadMetricEntries(locals.db, user.id, 'weight', range);
	return { entries, range };
};

export const actions: Actions = {
	addEntry: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/login');
		const formData = await request.formData();
		const result = weightSchema.safeParse({
			metricType: 'weight',
			value: formData.get('value'),
			date: formData.get('date'),
			time: formData.get('time')
		});
		if (!result.success) {
			return fail(400, { metricType: 'weight', errors: result.error.flatten().fieldErrors });
		}
		const recordedAt = new Date(`${result.data.date}T${result.data.time}`);
		await locals.db.insert(metricEntries).values({
			userId: locals.user.id,
			metricType: 'weight',
			valueNumeric: result.data.value,
			recordedAt
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
