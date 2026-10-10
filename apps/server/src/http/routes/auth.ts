import { Hono } from 'hono';
import { CLIENT_IP_HEADER, type Auth } from '../../modules/identity';
import { connectionAddress } from '../identity';

/**
 * Better Auth's endpoints (email code request and verification, session, sign-out), mounted under /v1/auth.
 * Their error bodies follow Better Auth's format rather than the API envelope.
 *
 * Rate limits are keyed by client IP. There is no reverse proxy, so the IP is the connection's address, and any
 * client-sent value of the header is overwritten: clients can't pick their own rate-limit bucket. If a proxy is
 * added, configure its trusted address in Better Auth instead (advanced.ipAddress.trustedProxies).
 */
export function authRoutes(auth: Auth) {
  return new Hono().on(['GET', 'POST'], '/auth/*', (c) => {
    const headers = new Headers(c.req.raw.headers);
    headers.delete(CLIENT_IP_HEADER);
    const address = connectionAddress(c);
    if (address) headers.set(CLIENT_IP_HEADER, address);
    return auth.handler(new Request(c.req.raw, { headers }));
  });
}
