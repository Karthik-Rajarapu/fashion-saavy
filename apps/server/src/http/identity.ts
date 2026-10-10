import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import { errorResponse } from './errors';

export type AppEnv = { Variables: { userId: string } };

export const DEV_USER_HEADER = 'x-dev-user-id';

/**
 * Resolves the calling user. Until Better Auth exists, the only identity is the development stand-in:
 * when (and only when) the server runs with DEV_AUTH=true, the `X-Dev-User-Id` header is trusted as the
 * user's id. Config refuses DEV_AUTH in production, so this can't authenticate anyone in a deployed server.
 */
export function requireUser({ devAuth }: { devAuth: boolean }) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!devAuth) return errorResponse(c, 401, 'unauthorized', "Sign-in isn't available yet.");

    const userId = z.uuid().safeParse(c.req.header(DEV_USER_HEADER));
    if (!userId.success) return errorResponse(c, 401, 'unauthorized', 'Missing or invalid user identity.');

    c.set('userId', userId.data.toLowerCase());
    await next();
  });
}
