import { Hono } from 'hono';
import type { HealthResponse } from '@fashion-saavy/contracts';

export function createApp() {
  const v1 = new Hono().get('/health', (c) => c.json({ status: 'ok' } satisfies HealthResponse));

  return new Hono().route('/v1', v1);
}
