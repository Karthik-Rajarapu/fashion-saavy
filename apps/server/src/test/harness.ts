import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import sharp from 'sharp';
import { ImageUploadTicketSchema } from '@fashion-saavy/contracts';
import { createApp } from '../http/app';
import { createAuth } from '../modules/identity';
import { createWardrobeService } from '../modules/wardrobe';
import { openDatabase } from '../platform/db/client';
import type { EmailSender, SignInCodeEmail } from '../platform/email/email-sender';
import { createLocalDiskStorage } from '../platform/storage/local-disk-storage';

export const TEST_AUTH_SECRET = 'test-auth-secret-0123456789abcdef0123456789';
export const TEST_SIGNING_SECRET = 'test-signing-secret-0123456789abcdef';

/** Captures sign-in codes instead of delivering them. Test-only. */
export function createRecordingEmailSender() {
  const sent: SignInCodeEmail[] = [];
  const sender: EmailSender = {
    kind: 'test',
    async sendSignInCode(email) {
      sent.push(email);
    },
  };
  return {
    sender,
    sent,
    latestCodeFor(email: string): string {
      const found = [...sent].reverse().find((e) => e.to === email.toLowerCase());
      if (!found) throw new Error(`No sign-in code was sent to ${email}`);
      return found.code;
    },
  };
}

type Options = {
  /** Use an on-disk database in this directory instead of an in-memory one. */
  databaseDir?: string;
  /** Reuse a storage directory (for restart tests). */
  storageDir?: string;
};

export type Session = { cookie: string; userId: string; email: string };

/**
 * A real app over a real (embedded) Postgres, real Better Auth and real local-disk storage: no mocks at the data
 * or auth layer. Starting the database is slow, so create one server per test file and call `reset()` between tests.
 */
export async function createTestServer({ databaseDir, storageDir }: Options = {}) {
  const tempDir = await mkdtemp(join(tmpdir(), 'fashion-saavy-test-'));
  const uploadsDir = storageDir ?? join(tempDir, 'uploads');
  const database = await openDatabase(databaseDir);
  const storage = createLocalDiskStorage({ rootDir: uploadsDir, secret: TEST_SIGNING_SECRET });
  const wardrobe = createWardrobeService({ db: database.db, storage });
  const email = createRecordingEmailSender();
  const auth = createAuth({ db: database.db, secret: TEST_AUTH_SECRET, emailSender: email.sender, appScheme: 'fashionsaavy' });
  const app = createApp({ auth, wardrobe, storage });

  // Each signIn() comes from its own address by default, so tests don't share rate-limit buckets by accident.
  let addressCounter = 0;
  const nextAddress = () => `198.51.100.${(addressCounter++ % 250) + 1}`;

  /** Calls the app as if from a TCP peer at `ip` (what @hono/node-server provides in production). */
  async function call(path: string, init: RequestInit, ip = '203.0.113.10') {
    return app.request(path, init, { incoming: { socket: { remoteAddress: ip } } });
  }

  async function request(
    method: string,
    path: string,
    { cookie, body, ip, headers: extra }: { cookie?: string; body?: unknown; ip?: string; headers?: Record<string, string> } = {},
  ) {
    const headers: Record<string, string> = { ...extra };
    if (cookie) headers.cookie = cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await call(
      path,
      { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) },
      ip,
    );
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return { status: res.status, body: parsed, headers: res.headers };
  }

  async function requestCode(emailAddress: string, ip?: string) {
    return request('POST', '/v1/auth/email-otp/send-verification-otp', { body: { email: emailAddress, type: 'sign-in' }, ip });
  }

  async function verifyCode(emailAddress: string, otp: string, ip?: string) {
    return request('POST', '/v1/auth/sign-in/email-otp', { body: { email: emailAddress, otp }, ip });
  }

  /** The full sign-in: request a code, read it from the recording sender, verify it. */
  async function signIn(emailAddress: string, ip = nextAddress()): Promise<Session> {
    const requested = await requestCode(emailAddress, ip);
    if (requested.status !== 200) throw new Error(`Code request failed: ${requested.status} ${JSON.stringify(requested.body)}`);
    const verified = await verifyCode(emailAddress, email.latestCodeFor(emailAddress), ip);
    if (verified.status !== 200) throw new Error(`Verification failed: ${verified.status} ${JSON.stringify(verified.body)}`);
    return { cookie: cookieFrom(verified.headers), userId: verified.body.user.id, email: emailAddress };
  }

  /** Runs the full photo handshake: request a ticket, upload to it. Returns the image id. */
  async function uploadPhoto(cookie: string, photo: Buffer, type = 'image/jpeg') {
    const ticket = ImageUploadTicketSchema.parse((await request('POST', '/v1/garment-images', { cookie })).body);
    const res = await postFile(ticket.url, photo, type, ticket.fileField);
    if (res.status !== 204) throw new Error(`Upload failed with ${res.status}: ${await res.text()}`);
    return ticket.imageId;
  }

  async function postFile(url: string, data: Buffer, type: string, field = 'file') {
    const form = new FormData();
    form.append(field, new Blob([new Uint8Array(data)], { type }), 'photo');
    return call(url, { method: 'POST', body: form });
  }

  return {
    app,
    db: database.db,
    email,
    uploadsDir,
    request,
    requestCode,
    verifyCode,
    signIn,
    uploadPhoto,
    postFile,
    async reset() {
      await database.db.execute(
        sql`truncate garments, garment_images, "user", session, account, verification, rate_limit cascade`,
      );
      email.sent.length = 0;
      await rm(uploadsDir, { recursive: true, force: true });
    },
    async close() {
      await database.close();
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}

/** Turns Set-Cookie response headers into a Cookie request header. */
export function cookieFrom(headers: Headers): string {
  return headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .filter((pair): pair is string => Boolean(pair) && !pair!.endsWith('='))
    .join('; ');
}

/** A small JPEG carrying EXIF (including GPS) and a rotate-90° orientation flag, like a phone photo. */
export function samplePhoto(width = 40, height = 20): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#a63a1f' } })
    .jpeg()
    .withExif({ IFD0: { Artist: 'Test Phone' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '17/1 23/1 0/1' } })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}
