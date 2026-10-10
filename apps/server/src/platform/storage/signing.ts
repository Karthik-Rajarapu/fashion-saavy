import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Compact signed tokens (`<base64url payload>.<base64url HMAC-SHA256>`) for capability URLs:
 * whoever holds a valid, unexpired token may perform exactly the action encoded in its payload.
 */
export function signToken(payload: object, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${mac(body, secret)}`;
}

/** Returns the payload when the signature is valid and `exp` (ms since epoch) is in the future, else null. */
export function verifyToken<T extends { exp: number }>(token: string, secret: string, now = Date.now()): T | null {
  const [body, signature, ...rest] = token.split('.');
  if (!body || !signature || rest.length > 0) return null;

  const expected = Buffer.from(mac(body, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
    return typeof payload.exp === 'number' && payload.exp > now ? payload : null;
  } catch {
    return null;
  }
}

function mac(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}
