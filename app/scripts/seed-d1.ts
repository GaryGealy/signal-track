/**
 * Seed the remote Cloudflare D1 database with the Try Me test user.
 * Run from app/ directory: npx tsx scripts/seed-d1.ts
 *
 * Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment,
 * or an active `wrangler login` session.
 *
 * Profile: healthy 35-year-old male, 6'0", average build (~180 lbs)
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const EMAIL = 'tryme@gmail.com';
const PASSWORD = 'Password!123';
const NAME = 'Try Me';
const DB_NAME = 'signal-track-db';

function jitter(base: number, range: number): number {
	return base + (Math.random() * 2 - 1) * range;
}

function dayTimestamp(daysAgo: number): number {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	d.setHours(8, 0, 0, 0);
	// Drizzle SQLite timestamps are stored as Unix seconds
	return Math.floor(d.getTime() / 1000);
}

function isWeekend(daysAgo: number): boolean {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	const day = d.getDay();
	return day === 0 || day === 6;
}

async function main() {
	console.log('Generating seed data...');

	const passwordHash = await bcrypt.hash(PASSWORD, 12);
	const userId = randomUUID();
	const now = Math.floor(Date.now() / 1000);

	const statements: string[] = [];

	// Remove existing test user and their data
	statements.push(`DELETE FROM metric_entries WHERE user_id IN (SELECT id FROM users WHERE email = '${EMAIL}');`);
	statements.push(`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = '${EMAIL}');`);
	statements.push(`DELETE FROM users WHERE email = '${EMAIL}';`);

	// Insert user
	statements.push(
		`INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ('${userId}', '${EMAIL}', '${passwordHash}', '${NAME}', ${now}, ${now});`
	);

	// Insert 30 days of metric entries
	for (let i = 29; i >= 0; i--) {
		const recordedAt = dayTimestamp(i);
		const entryNow = Math.floor(Date.now() / 1000);

		// Weight: ~180 lbs trending down from 182 → 179
		const weightBase = 182 - (29 - i) * 0.1;
		const weight = Math.round(jitter(weightBase, 0.8) * 10) / 10;
		statements.push(
			`INSERT INTO metric_entries (id, user_id, metric_type, value_numeric, recorded_at, created_at) VALUES ('${randomUUID()}', '${userId}', 'weight', ${weight}, ${recordedAt}, ${entryNow});`
		);

		// Blood pressure: ~120/76 weekdays, ~116/75 weekends
		const stressOffset = isWeekend(i) ? -2 : 2;
		const systolic = Math.round(jitter(118 + stressOffset, 4));
		const diastolic = Math.round(jitter(76 + stressOffset * 0.5, 3));
		statements.push(
			`INSERT INTO metric_entries (id, user_id, metric_type, value_numeric, value_secondary, recorded_at, created_at) VALUES ('${randomUUID()}', '${userId}', 'blood_pressure', ${systolic}, ${diastolic}, ${recordedAt}, ${entryNow});`
		);

		// Sleep: ~7.5h weeknights, ~8.5h weekends (minutes)
		const sleepBase = isWeekend(i) ? 510 : 450;
		const sleep = Math.round(jitter(sleepBase, 25));
		statements.push(
			`INSERT INTO metric_entries (id, user_id, metric_type, value_duration, recorded_at, created_at) VALUES ('${randomUUID()}', '${userId}', 'sleep', ${sleep}, ${recordedAt}, ${entryNow});`
		);

		// Work: ~8h on weekdays only
		if (!isWeekend(i)) {
			const work = Math.round(jitter(480, 40));
			statements.push(
				`INSERT INTO metric_entries (id, user_id, metric_type, value_duration, recorded_at, created_at) VALUES ('${randomUUID()}', '${userId}', 'work', ${work}, ${recordedAt}, ${entryNow});`
			);
		}
	}

	const sqlFile = '/tmp/signal-track-seed.sql';
	writeFileSync(sqlFile, statements.join('\n'));
	console.log(`Written ${statements.length} SQL statements to ${sqlFile}`);

	console.log('Applying to remote D1...');
	execSync(`npx wrangler d1 execute ${DB_NAME} --remote --file=${sqlFile}`, {
		stdio: 'inherit',
		cwd: process.cwd()
	});

	unlinkSync(sqlFile);

	console.log('\nDone! Login credentials:');
	console.log(`  Email:    ${EMAIL}`);
	console.log(`  Password: ${PASSWORD}`);
}

main().catch(console.error);
