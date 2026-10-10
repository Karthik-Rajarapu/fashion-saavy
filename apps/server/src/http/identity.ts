import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Auth } from '../modules/identity';
import { errorResponse } from './errors';

export type AppEnv = { Variables: { userId: string } };

/**
 * Resolves the calling user from a verified Better Auth session (cookie set at sign-in; the mobile app sends it
 * from secure storage). The user id comes only from the server-side session record, never from the request body
 * or any client-chosen header.
 */
export function requireUser(auth: Auth) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return errorResponse(c, 401, 'unauthorized', 'Sign in to continue.');
    c.set('userId', session.user.id);
    await next();
  });
}

/** The TCP peer address from @hono/node-server. In tests, passed through `app.request(..., env)`. */
export function connectionAddress(c: Context): string | undefined {
  const env = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
  return env?.incoming?.socket?.remoteAddress;
}
