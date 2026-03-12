import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { users, metricEntries } from './schema';
import { eq } from 'drizzle-orm';

const client = new Database(process.env.DATABASE_URL ?? './local.db');
const db = drizzle(client, { schema });

const DEV_USER_ID = 'dev-user-001';

async function seed() {
  // Insert dev user — idempotent via primary key conflict
  await db
    .insert(users)
    .values({
      id: DEV_USER_ID,
      email: 'dev@example.com',
      passwordHash: 'not-a-real-hash',
      name: 'Gary'
    })
    .onConflictDoNothing();

  // Guard: skip metric seeding if entries already exist for this user
  const existing = await db
    .select({ id: metricEntries.id })
    .from(metricEntries)
    .where(eq(metricEntries.userId, DEV_USER_ID))
    .limit(1);

  if (existing.length > 0) {
    console.log('Seed data already present — skipping metric inserts.');
    return;
  }

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  // Weight: 14 entries, slight downward trend
  const weightValues = [188, 187, 186.5, 186, 185.5, 185, 184.5, 184, 183.5, 183.5, 183, 183, 183, 183];
  for (let i = 0; i < 14; i++) {
    await db.insert(metricEntries).values({
      userId: DEV_USER_ID,
      metricType: 'weight',
      valueNumeric: weightValues[i],
      recordedAt: new Date(now.getTime() - (13 - i) * day)
    });
  }

  // Blood pressure: 14 entries
  const bpValues = [
    [122, 80], [120, 78], [119, 77], [121, 79], [118, 76],
    [120, 78], [117, 76], [119, 77], [118, 75], [120, 78],
    [117, 76], [118, 76], [118, 76], [118, 76]
  ];
  for (let i = 0; i < 14; i++) {
    await db.insert(metricEntries).values({
      userId: DEV_USER_ID,
      metricType: 'blood_pressure',
      valueNumeric: bpValues[i][0],
      valueSecondary: bpValues[i][1],
      recordedAt: new Date(now.getTime() - (13 - i) * day)
    });
  }

  // Sleep: 14 entries (stored as minutes)
  const sleepValues = [420, 450, 390, 480, 440, 460, 420, 430, 440, 450, 460, 435, 442, 442];
  for (let i = 0; i < 14; i++) {
    await db.insert(metricEntries).values({
      userId: DEV_USER_ID,
      metricType: 'sleep',
      valueDuration: sleepValues[i],
      recordedAt: new Date(now.getTime() - (13 - i) * day)
    });
  }

  // Work: 14 entries (stored as minutes)
  const workValues = [480, 420, 510, 390, 450, 480, 360, 420, 450, 480, 405, 390, 405, 405];
  for (let i = 0; i < 14; i++) {
    await db.insert(metricEntries).values({
      userId: DEV_USER_ID,
      metricType: 'work',
      valueDuration: workValues[i],
      recordedAt: new Date(now.getTime() - (13 - i) * day)
    });
  }

  console.log('Seed complete.');
}

seed().catch(console.error);
