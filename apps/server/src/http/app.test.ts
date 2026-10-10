import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from '@fashion-saavy/contracts';
import { createApp } from './app';

describe('GET /v1/health', () => {
  it('responds 200 with a body matching the shared contract', async () => {
    const res = await createApp().request('/v1/health');

    expect(res.status).toBe(200);
    expect(HealthResponseSchema.parse(await res.json())).toEqual({ status: 'ok' });
  });

  it('is only served under the versioned prefix', async () => {
    const res = await createApp().request('/health');

    expect(res.status).toBe(404);
  });
});
