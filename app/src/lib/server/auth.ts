import bcrypt from 'bcryptjs';
import { db } from './db';
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

export async function createSession(userId: string): Promise<string> {
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

	const [session] = await db.insert(sessions).values({ userId, expiresAt }).returning();

	if (!session) throw new Error('Failed to create session');
	return session.id;
}

export async function validateSession(token: string) {
	const result = await db
		.select()
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, token))
		.get();

	if (!result) return null;
	if (result.sessions.expiresAt < new Date()) {
		await deleteSession(token);
		return null;
	}

	return { user: result.users, session: result.sessions };
}

export async function deleteSession(token: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, token));
}
