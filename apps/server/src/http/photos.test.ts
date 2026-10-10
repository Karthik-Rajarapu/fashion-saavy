import { readdir } from 'node:fs/promises';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ApiErrorResponseSchema, GarmentSchema, ImageUploadTicketSchema } from '@fashion-saavy/contracts';
import { signToken } from '../platform/storage/signing';
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

async function ticket(user = ALICE) {
  const res = await server.request('POST', '/v1/garment-images', { user });
  expect(res.status).toBe(201);
  return ImageUploadTicketSchema.parse(res.body);
}

async function fetchBytes(url: string) {
  const res = await server.app.request(url);
  return { status: res.status, type: res.headers.get('content-type'), bytes: Buffer.from(await res.arrayBuffer()) };
}

async function storedFiles(dir = server.uploadsDir): Promise<string[]> {
  try {
    return (await readdir(dir, { recursive: true, withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

describe('photo upload and storage', () => {
  it('stores only re-encoded derivatives: EXIF and GPS stripped, orientation applied', async () => {
    const original = await samplePhoto(40, 20);
    const originalMeta = await sharp(original).metadata();
    expect(originalMeta.exif).toBeDefined();
    expect(originalMeta.orientation).toBe(6);

    const imageId = await server.uploadPhoto(ALICE, original);
    const garment = GarmentSchema.parse(
      (await server.request('POST', '/v1/garments', { user: ALICE, body: { category: 'top', imageId } })).body,
    );
    expect(garment.image?.id).toBe(imageId);

    const display = await fetchBytes(garment.image!.displayUrl);
    expect(display.status).toBe(200);
    expect(display.type).toBe('image/jpeg');
    const meta = await sharp(display.bytes).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    // Rotated by the orientation flag before the flag was dropped: 40×20 becomes 20×40.
    expect([meta.width, meta.height]).toEqual([20, 40]);

    expect((await fetchBytes(garment.image!.thumbnailUrl)).status).toBe(200);
  });

  it('accepts PNG and WebP, and rejects files that are not images', async () => {
    for (const [type, data] of [
      ['image/png', await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } }).png().toBuffer()],
      ['image/webp', await sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } }).webp().toBuffer()],
    ] as const) {
      const t = await ticket();
      expect((await server.postFile(t.url, data, type)).status).toBe(204);
    }

    const t = await ticket();
    const fake = await server.postFile(t.url, Buffer.from('definitely not a jpeg'), 'image/jpeg');
    expect(fake.status).toBe(415);
    expect(errorCode(await fake.json())).toBe('unsupported_media_type');

    const wrongType = await server.postFile((await ticket()).url, await samplePhoto(), 'application/pdf');
    expect(wrongType.status).toBe(415);
  });

  it('rejects uploads over the size limit', async () => {
    const t = await ticket();
    const res = await server.postFile(t.url, Buffer.alloc(t.maxBytes + 1), 'image/jpeg');

    expect(res.status).toBe(413);
    expect(errorCode(await res.json())).toBe('payload_too_large');
  });

  it('rejects tampered, forged, expired and reused upload links', async () => {
    const photo = await samplePhoto();
    const t = await ticket();
    const token = t.url.split('/').pop()!;

    const tampered = await server.postFile(t.url.replace(token, `${token.slice(0, -2)}xx`), photo, 'image/jpeg');
    expect(tampered.status).toBe(403);

    const forgedToken = signToken({ kind: 'upload', imageId: t.imageId, ownerId: ALICE, exp: Date.now() + 60_000 }, 'wrong-secret');
    expect((await server.postFile(`http://localhost/v1/uploads/${forgedToken}`, photo, 'image/jpeg')).status).toBe(403);

    const expiredToken = signToken(
      { kind: 'upload', imageId: t.imageId, ownerId: ALICE, exp: Date.now() - 1 },
      'test-signing-secret-0123456789abcdef',
    );
    expect((await server.postFile(`http://localhost/v1/uploads/${expiredToken}`, photo, 'image/jpeg')).status).toBe(403);

    expect((await server.postFile(t.url, photo, 'image/jpeg')).status).toBe(204);
    const reused = await server.postFile(t.url, photo, 'image/jpeg');
    expect(reused.status).toBe(409);
  });

  it('rejects tampered read links and keeps files private to signed URLs', async () => {
    const imageId = await server.uploadPhoto(ALICE, await samplePhoto());
    const garment = GarmentSchema.parse(
      (await server.request('POST', '/v1/garments', { user: ALICE, body: { category: 'top', imageId } })).body,
    );
    const url = garment.image!.displayUrl;

    expect((await fetchBytes(`${url.slice(0, -2)}xx`)).status).toBe(403);
    // A read link can't be repurposed as an upload link, or vice versa.
    const readToken = url.split('/').pop()!;
    expect((await server.postFile(`http://localhost/v1/uploads/${readToken}`, await samplePhoto(), 'image/jpeg')).status).toBe(403);
  });

  it('refuses photos that are not finished uploading or already belong to another garment', async () => {
    const pending = await ticket();
    const notReady = await server.request('POST', '/v1/garments', { user: ALICE, body: { category: 'top', imageId: pending.imageId } });
    expect(notReady.status).toBe(409);

    const imageId = await server.uploadPhoto(ALICE, await samplePhoto());
    expect((await server.request('POST', '/v1/garments', { user: ALICE, body: { category: 'top', imageId } })).status).toBe(201);
    const twice = await server.request('POST', '/v1/garments', { user: ALICE, body: { category: 'bottom', imageId } });
    expect(twice.status).toBe(409);
    expect(errorCode(twice.body)).toBe('conflict');
  });

  it('requires an identity to request an upload', async () => {
    const res = await server.request('POST', '/v1/garment-images');
    expect(res.status).toBe(401);
  });

  it('removes the old photo when a garment photo is replaced, and all photos when it is deleted', async () => {
    const first = await server.uploadPhoto(ALICE, await samplePhoto());
    const garment = GarmentSchema.parse(
      (await server.request('POST', '/v1/garments', { user: ALICE, body: { category: 'top', imageId: first } })).body,
    );
    const oldUrl = garment.image!.displayUrl;
    expect(await storedFiles()).toHaveLength(2); // display + thumbnail

    const second = await server.uploadPhoto(ALICE, await samplePhoto());
    const replaced = GarmentSchema.parse(
      (await server.request('PATCH', `/v1/garments/${garment.id}`, { user: ALICE, body: { imageId: second } })).body,
    );
    expect(replaced.image?.id).toBe(second);
    expect((await fetchBytes(oldUrl)).status).toBe(404);
    expect(await storedFiles()).toHaveLength(2);

    expect((await server.request('DELETE', `/v1/garments/${garment.id}`, { user: ALICE })).status).toBe(204);
    expect(await storedFiles()).toHaveLength(0);
  });

  it("can't touch another user's photo by deleting their own garment", async () => {
    const bobsPhoto = await server.uploadPhoto(BOB, await samplePhoto());
    const bobs = GarmentSchema.parse(
      (await server.request('POST', '/v1/garments', { user: BOB, body: { category: 'top', imageId: bobsPhoto } })).body,
    );
    const alices = GarmentSchema.parse((await server.request('POST', '/v1/garments', { user: ALICE, body: { category: 'top' } })).body);

    await server.request('DELETE', `/v1/garments/${alices.id}`, { user: ALICE });
    expect((await fetchBytes(bobs.image!.displayUrl)).status).toBe(200);
  });
});
