/**
 * Seed script: creates "Try Me" test user with 30 days of realistic data.
 * Run from app/ directory: npx tsx scripts/seed-test-user.ts
 *
 * Profile: healthy 35-year-old male, 6'0", average build (~180 lbs)
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { users, metricEntries } from '../src/lib/server/db/schema.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'local.db';
const sqlite = new Database(DATABASE_URL);
const db = drizzle(sqlite);

const EMAIL = 'tryme@gmail.com';
const PASSWORD = 'Password!123';
const NAME = 'Try Me';

function jitter(base: number, range: number): number {
	return base + (Math.random() * 2 - 1) * range;
}

function dayDate(daysAgo: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	d.setHours(8, 0, 0, 0);
	return d;
}

function isWeekend(daysAgo: number): boolean {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	const day = d.getDay();
	return day === 0 || day === 6;
}

async function main() {
	// Remove existing test user if present
	const existing = await db.select().from(users).where(eq(users.email, EMAIL)).get();
	if (existing) {
		await db.delete(metricEntries).where(eq(metricEntries.userId, existing.id));
		await db.delete(users).where(eq(users.id, existing.id));
		console.log('Removed existing test user.');
	}

	// Create user
	const passwordHash = await bcrypt.hash(PASSWORD, 12);
	const [user] = await db
		.insert(users)
		.values({ email: EMAIL, name: NAME, passwordHash })
		.returning();
	if (!user) throw new Error('Failed to create user');
	console.log(`Created user: ${user.name} <${user.email}> (id: ${user.id})`);

	const entries: (typeof metricEntries.$inferInsert)[] = [];

	for (let i = 29; i >= 0; i--) {
		const recordedAt = dayDate(i);

		// Weight: ~180 lbs with slight downward trend and daily noise
		// Trending from 182 → 179 over 30 days with ±0.8 lb noise
		const weightBase = 182 - (29 - i) * 0.1;
		entries.push({
			userId: user.id,
			metricType: 'weight',
			valueNumeric: Math.round(jitter(weightBase, 0.8) * 10) / 10,
			recordedAt
		});

		// Blood pressure: systolic ~118, diastolic ~76, slight weekday stress
		const stressOffset = isWeekend(i) ? -2 : 2;
		entries.push({
			userId: user.id,
			metricType: 'blood_pressure',
			valueNumeric: Math.round(jitter(118 + stressOffset, 4)),
			valueSecondary: Math.round(jitter(76 + stressOffset * 0.5, 3)),
			recordedAt
		});

		// Sleep: 7–8h on weeknights, 8–9h on weekends (in minutes)
		const sleepBase = isWeekend(i) ? 510 : 450; // 8.5h vs 7.5h base
		entries.push({
			userId: user.id,
			metricType: 'sleep',
			valueDuration: Math.round(jitter(sleepBase, 25)),
			recordedAt
		});

		// Work: ~8h on weekdays, skip weekends
		if (!isWeekend(i)) {
			entries.push({
				userId: user.id,
				metricType: 'work',
				valueDuration: Math.round(jitter(480, 40)), // 8h ± ~40min
				recordedAt
			});
		}
	}

	await db.insert(metricEntries).values(entries);
	console.log(`Inserted ${entries.length} metric entries across 30 days.`);
	console.log('\nLogin credentials:');
	console.log(`  Email:    ${EMAIL}`);
	console.log(`  Password: ${PASSWORD}`);
}

main()
	.catch(console.error)
	.finally(() => sqlite.close());
