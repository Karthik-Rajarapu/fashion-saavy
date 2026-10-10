import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ApiErrorResponseSchema, HealthResponseSchema } from '@fashion-saavy/contracts';
import { createTestServer } from '../test/harness';

let server: Awaited<ReturnType<typeof createTestServer>>;
beforeAll(async () => {
  server = await createTestServer();
});
beforeEach(async () => {
  await server.reset();
});
afterAll(async () => {
  await server.close();
});

describe('GET /v1/health', () => {
  it('responds 200 with a body matching the shared contract', async () => {
    const res = await server.request('GET', '/v1/health');

    expect(res.status).toBe(200);
    expect(HealthResponseSchema.parse(res.body)).toEqual({ status: 'ok' });
  });

  it('is only served under the versioned prefix, with the shared error envelope otherwise', async () => {
    const res = await server.request('GET', '/health');

    expect(res.status).toBe(404);
    expect(ApiErrorResponseSchema.parse(res.body).error.code).toBe('not_found');
  });
});
