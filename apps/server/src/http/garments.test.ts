import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ApiErrorResponseSchema, GarmentSchema, ListGarmentsResponseSchema } from '@fashion-saavy/contracts';
import { ALICE, BOB, createTestServer, samplePhoto } from '../test/harness';

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

const errorCode = (body: unknown) => ApiErrorResponseSchema.parse(body).error.code;
const MISSING_ID = '33333333-3333-4333-8333-333333333333';

async function createGarment(user: string, body: Record<string, unknown> = { category: 'top' }) {
  const res = await server.request('POST', '/v1/garments', { user, body });
  expect(res.status).toBe(201);
  return GarmentSchema.parse(res.body);
}

describe('creating and reading garments', () => {
  it('creates a confirmed garment whose attributes are all user-sourced, and lists it', async () => {
    const created = await createGarment(ALICE, {
      category: 'ethnic',
      name: 'Indigo kurta',
      attributes: { color: 'Indigo', occasions: ['festive', 'college'] },
    });

    expect(created).toMatchObject({
      category: 'ethnic',
      name: 'Indigo kurta',
      attributes: { color: 'Indigo', occasions: ['festive', 'college'] },
      attributeSources: { color: 'user', occasions: 'user' },
      fitNote: null,
      status: 'confirmed',
      image: null,
    });

    const list = ListGarmentsResponseSchema.parse((await server.request('GET', '/v1/garments', { user: ALICE })).body);
    expect(list.garments.map((g) => g.id)).toEqual([created.id]);

    const one = await server.request('GET', `/v1/garments/${created.id}`, { user: ALICE });
    expect(GarmentSchema.parse(one.body)).toEqual(created);
  });

  it('lists newest first', async () => {
    const first = await createGarment(ALICE);
    const second = await createGarment(ALICE, { category: 'bottom' });

    const list = ListGarmentsResponseSchema.parse((await server.request('GET', '/v1/garments', { user: ALICE })).body);
    expect(list.garments.map((g) => g.id)).toEqual([second.id, first.id]);
  });

  it.each([
    ['a missing category', {}],
    ['shoes, which are out of scope for V1', { category: 'shoes' }],
    ['an unknown field such as an owner override', { category: 'top', ownerId: BOB }],
    ['an over-long name', { category: 'top', name: 'x'.repeat(81) }],
    ['a blank attribute', { category: 'top', attributes: { color: '   ' } }],
    ['an unknown occasion', { category: 'top', attributes: { occasions: ['gym'] } }],
    ['a malformed image id', { category: 'top', imageId: 'not-a-uuid' }],
  ])('rejects %s with validation_failed', async (_case, body) => {
    const res = await server.request('POST', '/v1/garments', { user: ALICE, body });

    expect(res.status).toBe(400);
    expect(errorCode(res.body)).toBe('validation_failed');
  });

  it('rejects malformed JSON as a validation failure, not a server error', async () => {
    const res = await server.request('POST', '/v1/garments', { user: ALICE, body: '{"category":' });

    expect(res.status).toBe(400);
    expect(errorCode(res.body)).toBe('validation_failed');
  });

  it('reports missing and malformed ids as not_found', async () => {
    for (const id of [MISSING_ID, 'not-a-uuid']) {
      for (const [method, body] of [['GET'], ['PATCH', { name: 'x' }], ['DELETE']] as const) {
        const res = await server.request(method, `/v1/garments/${id}`, { user: ALICE, body });
        expect(res.status).toBe(404);
        expect(errorCode(res.body)).toBe('not_found');
      }
    }
  });
});

describe('updating and deleting', () => {
  it('applies a partial update, clears fields with null, and bumps updatedAt', async () => {
    const created = await createGarment(ALICE, { category: 'top', name: 'Old', fitNote: 'Runs small' });

    const res = await server.request('PATCH', `/v1/garments/${created.id}`, {
      user: ALICE,
      body: { category: 'layer', fitNote: null, attributes: { pattern: 'Checked' } },
    });

    expect(res.status).toBe(200);
    const updated = GarmentSchema.parse(res.body);
    expect(updated).toMatchObject({
      category: 'layer',
      name: 'Old',
      fitNote: null,
      attributes: { pattern: 'Checked' },
      attributeSources: { pattern: 'user' },
    });
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt));
  });

  it('rejects an empty update and invalid values', async () => {
    const created = await createGarment(ALICE);

    for (const body of [{}, { category: 'shoes' }, { status: 'draft' }]) {
      const res = await server.request('PATCH', `/v1/garments/${created.id}`, { user: ALICE, body });
      expect(res.status).toBe(400);
      expect(errorCode(res.body)).toBe('validation_failed');
    }
  });

  it('deletes a garment', async () => {
    const created = await createGarment(ALICE);

    expect((await server.request('DELETE', `/v1/garments/${created.id}`, { user: ALICE })).status).toBe(204);
    expect((await server.request('GET', `/v1/garments/${created.id}`, { user: ALICE })).status).toBe(404);
  });
});

describe('authorization boundaries', () => {
  it('requires an identity', async () => {
    for (const user of [undefined, 'not-a-uuid']) {
      const res = await server.request('GET', '/v1/garments', { user });
      expect(res.status).toBe(401);
      expect(errorCode(res.body)).toBe('unauthorized');
    }
  });

  it('accepts no identity at all when development identity is off', async () => {
    const res = await server.request('GET', '/v1/garments', { user: ALICE, flipDevAuth: true });
    expect(res.status).toBe(401);
    expect(errorCode(res.body)).toBe('unauthorized');
  });

  it("keeps each user's wardrobe private: other users' garments look missing", async () => {
    const alices = await createGarment(ALICE, { category: 'top', name: 'Alice top' });

    const bobList = ListGarmentsResponseSchema.parse((await server.request('GET', '/v1/garments', { user: BOB })).body);
    expect(bobList.garments).toEqual([]);

    for (const [method, body] of [['GET'], ['PATCH', { name: 'Taken' }], ['DELETE']] as const) {
      const res = await server.request(method, `/v1/garments/${alices.id}`, { user: BOB, body });
      expect(res.status).toBe(404);
    }

    const stillAlices = GarmentSchema.parse((await server.request('GET', `/v1/garments/${alices.id}`, { user: ALICE })).body);
    expect(stillAlices.name).toBe('Alice top');
  });

  it("won't attach another user's photo", async () => {
    const alicesPhoto = await server.uploadPhoto(ALICE, await samplePhoto());

    const res = await server.request('POST', '/v1/garments', { user: BOB, body: { category: 'top', imageId: alicesPhoto } });
    expect(res.status).toBe(400);
    expect(errorCode(res.body)).toBe('validation_failed');
  });
});
