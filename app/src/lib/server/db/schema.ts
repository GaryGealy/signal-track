import { integer, real, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
});

export const metricEntries = sqliteTable(
  'metric_entries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    metricType: text('metric_type', {
      enum: ['weight', 'blood_pressure', 'sleep', 'work']
    }).notNull(),
    valueNumeric: real('value_numeric'),
    valueSecondary: real('value_secondary'),
    valueDuration: integer('value_duration'),
    recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
  },
  (table) => [
    index('idx_user_id').on(table.userId),
    index('idx_metric_type').on(table.metricType),
    index('idx_recorded_at').on(table.recordedAt),
    index('idx_user_metric_recorded').on(table.userId, table.metricType, table.recordedAt)
  ]
);

export type MetricType = 'weight' | 'blood_pressure' | 'sleep' | 'work';
export type MetricEntry = typeof metricEntries.$inferSelect;
export type NewMetricEntry = typeof metricEntries.$inferInsert;
