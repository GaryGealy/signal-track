import bcrypt from 'bcryptjs';
import { users, sessions } from './db/schema';
import { eq } from 'drizzle-orm';

export const SESSION_COOKIE = 'session_token';
const SESSION_TTL_DAYS = 30;
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createSession(db: any, userId: string): Promise<string> {
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

	const [session] = await db.insert(sessions).values({ userId, expiresAt }).returning();

	if (!session) throw new Error('Failed to create session');
	return session.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function validateSession(db: any, token: string) {
	const result = await db
		.select()
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, token))
		.get();

	if (!result) return null;
	if (result.sessions.expiresAt < new Date()) {
		await deleteSession(db, token);
		return null;
	}

	return { user: result.users, session: result.sessions };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deleteSession(db: any, token: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, token));
}
