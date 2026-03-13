import type { Handle } from '@sveltejs/kit';
import { validateSession, SESSION_COOKIE } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(SESSION_COOKIE);

  if (token) {
    const result = await validateSession(token);
    if (result) {
      event.locals.user = result.user;
      event.locals.session = result.session;
    } else {
      event.locals.user = null;
      event.locals.session = null;
    }
  } else {
    event.locals.user = null;
    event.locals.session = null;
  }

  return resolve(event);
};
