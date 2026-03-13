/* eslint-disable @typescript-eslint/no-explicit-any */
import { metricEntries } from './db/schema';
import { eq, and, gte, asc } from 'drizzle-orm';
import type { MetricType, MetricEntry } from './db/schema';

export async function loadMetricEntries(
	db: any,
	userId: string,
	metricType: MetricType,
	range: string
): Promise<MetricEntry[]> {
	const conditions: ReturnType<typeof eq>[] = [
		eq(metricEntries.userId, userId),
		eq(metricEntries.metricType, metricType)
	];

	if (range !== 'all') {
		const days = parseInt(range) || 30;
		const since = new Date();
		since.setDate(since.getDate() - days);
		conditions.push(gte(metricEntries.recordedAt, since));
	}

	return db
		.select()
		.from(metricEntries)
		.where(and(...conditions))
		.orderBy(asc(metricEntries.recordedAt));
}

export async function deleteMetricEntry(db: any, id: string, userId: string): Promise<void> {
	await db
		.delete(metricEntries)
		.where(and(eq(metricEntries.id, id), eq(metricEntries.userId, userId)));
}
