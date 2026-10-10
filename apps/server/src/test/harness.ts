import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import sharp from 'sharp';
import { ImageUploadTicketSchema } from '@fashion-saavy/contracts';
import { createApp } from '../http/app';
import { DEV_USER_HEADER } from '../http/identity';
import { createWardrobeService } from '../modules/wardrobe';
import { openDatabase } from '../platform/db/client';
import { createLocalDiskStorage } from '../platform/storage/local-disk-storage';

export const ALICE = '11111111-1111-4111-8111-111111111111';
export const BOB = '22222222-2222-4222-8222-222222222222';

type Options = {
  devAuth?: boolean;
  /** Use an on-disk database in this directory instead of an in-memory one. */
  databaseDir?: string;
  /** Reuse a storage directory (for restart tests). */
  storageDir?: string;
};

/**
 * A real app over a real (embedded) Postgres and real local-disk storage: no mocks at the data layer.
 * Starting the database is slow, so create one server per test file and call `reset()` between tests.
 */
export async function createTestServer({ devAuth = true, databaseDir, storageDir }: Options = {}) {
  const tempDir = await mkdtemp(join(tmpdir(), 'fashion-saavy-test-'));
  const uploadsDir = storageDir ?? join(tempDir, 'uploads');
  const database = await openDatabase(databaseDir);
  const storage = createLocalDiskStorage({ rootDir: uploadsDir, secret: 'test-signing-secret-0123456789abcdef' });
  const wardrobe = createWardrobeService({ db: database.db, storage });
  const app = createApp({ devAuth, wardrobe, storage });
  // Same data, with development identity switched the other way, for authorization tests.
  const flippedApp = createApp({ devAuth: !devAuth, wardrobe, storage });

  async function request(
    method: string,
    path: string,
    { user, body, flipDevAuth = false }: { user?: string; body?: unknown; flipDevAuth?: boolean } = {},
  ) {
    const headers: Record<string, string> = {};
    if (user) headers[DEV_USER_HEADER] = user;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await (flipDevAuth ? flippedApp : app).request(path, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? (JSON.parse(text) as any) : null, headers: res.headers };
  }

  /** Runs the full photo handshake: request a ticket, upload to it. Returns the image id. */
  async function uploadPhoto(user: string, photo: Buffer, type = 'image/jpeg') {
    const ticket = ImageUploadTicketSchema.parse((await request('POST', '/v1/garment-images', { user })).body);
    const res = await postFile(ticket.url, photo, type, ticket.fileField);
    if (res.status !== 204) throw new Error(`Upload failed with ${res.status}: ${await res.text()}`);
    return ticket.imageId;
  }

  async function postFile(url: string, data: Buffer, type: string, field = 'file') {
    const form = new FormData();
    form.append(field, new Blob([new Uint8Array(data)], { type }), 'photo');
    return app.request(url, { method: 'POST', body: form });
  }

  return {
    app,
    uploadsDir,
    request,
    uploadPhoto,
    postFile,
    async reset() {
      await database.db.execute(sql`truncate garments, garment_images`);
      await rm(uploadsDir, { recursive: true, force: true });
    },
    async close() {
      await database.close();
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}

/** A small JPEG carrying EXIF (including GPS) and a rotate-90° orientation flag, like a phone photo. */
export function samplePhoto(width = 40, height = 20): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#a63a1f' } })
    .jpeg()
    .withExif({ IFD0: { Artist: 'Test Phone' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '17/1 23/1 0/1' } })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}
