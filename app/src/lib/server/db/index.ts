// DB instance is created per-request in hooks.server.ts and accessed via event.locals.db.
// This file is kept for backwards-compatible imports of schema and types.
export * from './schema';
