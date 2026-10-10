import {
  CreateGarmentRequestSchema,
  UpdateGarmentRequestSchema,
  type ApiErrorCode,
  type Garment,
} from '@fashion-saavy/contracts';

export const API_URL = 'http://api.test';
export const DEV_USER = '7f1f5b4e-3c2a-4d6e-9b8a-1c2d3e4f5a6b';

type Failure = { method: string; path: RegExp; status: number; code: ApiErrorCode; message: string; times: number };
type Call = { method: string; path: string; body: unknown };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const apiError = (status: number, code: ApiErrorCode, message: string) => json(status, { error: { code, message } });

/**
 * An in-memory stand-in for the API, installed at the network boundary (global fetch). It validates request
 * bodies against the shared contracts, so a client sending an invalid request fails the test. Its store
 * outlives any one rendered app, which lets tests restart the app and check that data came from the server.
 */
export function installFakeApi() {
  const garments = new Map<string, Garment>();
  const readyImages = new Set<string>();
  const failures: Failure[] = [];
  const calls: Call[] = [];
  let seq = 0;
  let clock = Date.parse('2026-10-10T10:00:00Z');

  const nextId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
  const nextTime = () => new Date((clock += 1000)).toISOString();
  const imageOf = (id: string) => ({
    id,
    displayUrl: `${API_URL}/v1/files/display-${id}`,
    thumbnailUrl: `${API_URL}/v1/files/thumb-${id}`,
    expiresAt: '2026-10-10T11:00:00.000Z',
  });

  async function handle(method: string, path: string, init: RequestInit | undefined): Promise<Response> {
    const failure = failures.find((f) => f.method === method && f.path.test(path) && f.times > 0);
    if (failure) {
      failure.times -= 1;
      if (failure.status === 0) throw new TypeError('Network request failed');
      return apiError(failure.status, failure.code, failure.message);
    }

    if (method === 'GET' && path === '/v1/health') return json(200, { status: 'ok' });

    if (path.startsWith('/v1/uploads/')) {
      readyImages.add(path.slice('/v1/uploads/tok-'.length));
      return new Response(null, { status: 204 });
    }

    const headers = new Headers(init?.headers);
    if (headers.get('X-Dev-User-Id') !== DEV_USER) return apiError(401, 'unauthorized', 'Missing or invalid user identity.');
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });

    if (method === 'POST' && path === '/v1/garment-images') {
      const imageId = nextId();
      return json(201, {
        imageId,
        url: `${API_URL}/v1/uploads/tok-${imageId}`,
        fields: {},
        fileField: 'file',
        maxBytes: 10 * 1024 * 1024,
        acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        expiresAt: '2026-10-10T10:15:00.000Z',
      });
    }
    if (method === 'GET' && path === '/v1/garments') {
      return json(200, { garments: [...garments.values()].reverse() });
    }
    if (method === 'POST' && path === '/v1/garments') {
      const parsed = CreateGarmentRequestSchema.safeParse(body);
      if (!parsed.success) return apiError(400, 'validation_failed', parsed.error.issues[0]?.message ?? 'Invalid');
      const input = parsed.data;
      if (input.imageId && !readyImages.has(input.imageId)) return apiError(409, 'conflict', 'The photo upload has not finished.');
      const now = nextTime();
      const garment: Garment = {
        id: nextId(),
        category: input.category,
        name: input.name ?? null,
        attributes: input.attributes ?? {},
        attributeSources: Object.fromEntries(Object.keys(input.attributes ?? {}).map((k) => [k, 'user'])),
        fitNote: input.fitNote ?? null,
        status: 'confirmed',
        image: input.imageId ? imageOf(input.imageId) : null,
        createdAt: now,
        updatedAt: now,
      };
      garments.set(garment.id, garment);
      return json(201, garment);
    }

    const match = /^\/v1\/garments\/([^/]+)$/.exec(path);
    const existing = match ? garments.get(decodeURIComponent(match[1]!)) : undefined;
    if (match && !existing) return apiError(404, 'not_found', 'Garment not found.');
    if (existing && method === 'GET') return json(200, existing);
    if (existing && method === 'DELETE') {
      garments.delete(existing.id);
      return new Response(null, { status: 204 });
    }
    if (existing && method === 'PATCH') {
      const parsed = UpdateGarmentRequestSchema.safeParse(body);
      if (!parsed.success) return apiError(400, 'validation_failed', parsed.error.issues[0]?.message ?? 'Invalid');
      const patch = parsed.data;
      const updated: Garment = {
        ...existing,
        ...(patch.category !== undefined && { category: patch.category }),
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.fitNote !== undefined && { fitNote: patch.fitNote }),
        ...(patch.attributes !== undefined && {
          attributes: patch.attributes,
          attributeSources: Object.fromEntries(Object.keys(patch.attributes).map((k) => [k, 'user'])),
        }),
        ...(patch.imageId !== undefined && { image: patch.imageId ? imageOf(patch.imageId) : null }),
        updatedAt: nextTime(),
      };
      garments.set(updated.id, updated);
      return json(200, updated);
    }
    return apiError(404, 'not_found', 'Not found.');
  }

  const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== API_URL) throw new Error(`Unexpected request to ${url.href}`);
    return handle((init?.method ?? 'GET').toUpperCase(), url.pathname, init);
  });

  return {
    garments,
    calls,
    fetchMock,
    /** Adds a garment as if saved earlier. */
    seed(fields: Partial<Garment> & Pick<Garment, 'category'>): Garment {
      const id = nextId();
      const now = nextTime();
      const garment: Garment = {
        id,
        name: null,
        attributes: {},
        attributeSources: {},
        fitNote: null,
        status: 'confirmed',
        image: imageOf(nextId()),
        createdAt: now,
        updatedAt: now,
        ...fields,
      };
      garments.set(id, garment);
      return garment;
    },
    /** Makes the next `times` matching requests fail. Status 0 simulates a network failure. */
    fail(method: string, path: RegExp, { status = 500, code = 'internal' as ApiErrorCode, message = 'Something went wrong on our side.', times = 1 } = {}) {
      failures.push({ method, path, status, code, message, times });
    },
  };
}

export type FakeApi = ReturnType<typeof installFakeApi>;
