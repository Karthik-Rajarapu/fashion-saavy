import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GarmentSchema, ListGarmentsResponseSchema } from '@fashion-saavy/contracts';
import { AUTH_RATE_LIMITS, CLIENT_IP_HEADER, SIGN_IN_CODE } from '../modules/identity';
import { cookieFrom, createTestServer, samplePhoto } from '../test/harness';

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

const EMAIL = 'alice@example.com';
let ipCounter = 0;
/** A fresh client address per test, so each starts with empty rate-limit buckets. */
const freshIp = () => `192.0.2.${(ipCounter++ % 250) + 1}`;

async function verificationRows() {
  return (await server.db.execute(sql`select identifier, value, expires_at from verification`)).rows as {
    identifier: string;
    value: string;
  }[];
}

describe('sign-in with an email code', () => {
  it('sends one 6-digit code, signs in with it, and restores the session from the cookie alone', async () => {
    const ip = freshIp();
    const requested = await server.requestCode(EMAIL, ip);
    expect(requested.status).toBe(200);
    expect(requested.body).toEqual({ success: true });
    expect(server.email.sent).toHaveLength(1);
    const code = server.email.latestCodeFor(EMAIL);
    expect(code).toMatch(new RegExp(`^\\d{${SIGN_IN_CODE.length}}$`));

    const verified = await server.verifyCode(EMAIL, code, ip);
    expect(verified.status).toBe(200);
    expect(verified.body.user).toMatchObject({ email: EMAIL, emailVerified: true });
    const cookie = cookieFrom(verified.headers);
    expect(verified.headers.getSetCookie().join(';')).toMatch(/HttpOnly/);

    // A later request with only the stored cookie is recognized (what the app does after a restart).
    const session = await server.request('GET', '/v1/auth/get-session', { cookie });
    expect(session.status).toBe(200);
    expect(session.body.user.id).toBe(verified.body.user.id);
    expect((await server.request('GET', '/v1/garments', { cookie })).status).toBe(200);
  });

  it('stores only a hash of the code, never the code itself', async () => {
    await server.requestCode(EMAIL, freshIp());
    const code = server.email.latestCodeFor(EMAIL);
    const rows = await verificationRows();

    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).not.toContain(code);
  });

  it('rejects a wrong code without creating a session', async () => {
    const ip = freshIp();
    await server.requestCode(EMAIL, ip);
    const wrong = server.email.latestCodeFor(EMAIL) === '000000' ? '111111' : '000000';

    const res = await server.verifyCode(EMAIL, wrong, ip);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_OTP');
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it(`invalidates a code after ${SIGN_IN_CODE.allowedAttempts} wrong attempts, even if the right one follows`, async () => {
    const ip = freshIp();
    await server.requestCode(EMAIL, ip);
    const code = server.email.latestCodeFor(EMAIL);
    const wrong = code === '000000' ? '111111' : '000000';

    for (let i = 0; i < SIGN_IN_CODE.allowedAttempts; i++) {
      expect((await server.verifyCode(EMAIL, wrong, ip)).body.code).toBe('INVALID_OTP');
    }
    const late = await server.verifyCode(EMAIL, code, ip);
    expect(late.status).toBe(403);
    expect(late.body.code).toBe('TOO_MANY_ATTEMPTS');
    expect(await verificationRows()).toHaveLength(0);
  });

  it('rejects an expired code', async () => {
    const ip = freshIp();
    await server.requestCode(EMAIL, ip);
    const code = server.email.latestCodeFor(EMAIL);
    // Equivalent to waiting out the 5-minute lifetime.
    await server.db.execute(sql`update verification set expires_at = now() - interval '1 second'`);

    const res = await server.verifyCode(EMAIL, code, ip);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OTP_EXPIRED');
  });

  it('expires codes after 5 minutes', async () => {
    await server.requestCode(EMAIL, freshIp());
    const [row] = (await server.db.execute(sql`select extract(epoch from (expires_at - now())) as seconds from verification`))
      .rows as { seconds: string }[];

    expect(Number(row!.seconds)).toBeGreaterThan(SIGN_IN_CODE.expiresInSeconds - 10);
    expect(Number(row!.seconds)).toBeLessThanOrEqual(SIGN_IN_CODE.expiresInSeconds);
  });

  it('refuses to reuse a code that already signed someone in', async () => {
    const ip = freshIp();
    await server.requestCode(EMAIL, ip);
    const code = server.email.latestCodeFor(EMAIL);
    expect((await server.verifyCode(EMAIL, code, ip)).status).toBe(200);

    const replay = await server.verifyCode(EMAIL, code, ip);
    expect(replay.status).toBe(400);
    expect(replay.body.code).toBe('INVALID_OTP');
  });

  it('replaces the previous code when a new one is requested', async () => {
    const ip = freshIp();
    await server.requestCode(EMAIL, ip);
    const first = server.email.latestCodeFor(EMAIL);
    await server.requestCode(EMAIL, ip);
    const second = server.email.latestCodeFor(EMAIL);

    if (first !== second) expect((await server.verifyCode(EMAIL, first, ip)).status).toBe(400);
    expect((await server.verifyCode(EMAIL, second, ip)).status).toBe(200);
  });

  it('answers the same way for new and existing addresses (no account enumeration)', async () => {
    await server.signIn('existing@example.com');

    const existing = await server.requestCode('existing@example.com', freshIp());
    const unknown = await server.requestCode('never-seen@example.com', freshIp());
    expect([existing.status, existing.body]).toEqual([unknown.status, unknown.body]);
  });

  it.each([
    ['a malformed email', { email: 'not-an-email', type: 'sign-in' }],
    ['a missing email', { type: 'sign-in' }],
    ['an unknown code type', { email: EMAIL, type: 'make-me-admin' }],
  ])('rejects a code request with %s and sends nothing', async (_case, body) => {
    const res = await server.request('POST', '/v1/auth/email-otp/send-verification-otp', { body, ip: freshIp() });
    expect(res.status).toBe(400);
    expect(server.email.sent).toHaveLength(0);
  });

  it('rejects a verification without a code', async () => {
    const res = await server.request('POST', '/v1/auth/sign-in/email-otp', { body: { email: EMAIL }, ip: freshIp() });
    expect(res.status).toBe(400);
  });

  it('offers no password sign-in', async () => {
    const res = await server.request('POST', '/v1/auth/sign-up/email', {
      body: { email: EMAIL, password: 'correct horse battery', name: 'A' },
      ip: freshIp(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});

describe('rate limits', () => {
  it(`allows ${AUTH_RATE_LIMITS.sendCode.max} code requests per minute per client, then refuses`, async () => {
    const ip = freshIp();
    for (let i = 0; i < AUTH_RATE_LIMITS.sendCode.max; i++) {
      expect((await server.requestCode(EMAIL, ip)).status).toBe(200);
    }
    const blocked = await server.requestCode(EMAIL, ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('x-retry-after'))).toBeGreaterThan(0);
    expect(server.email.sent).toHaveLength(AUTH_RATE_LIMITS.sendCode.max);

    // Another client is unaffected: buckets are per address, not global.
    expect((await server.requestCode('bob@example.com', freshIp())).status).toBe(200);
  });

  it("can't be bypassed by sending the rate-limit IP header from the client", async () => {
    const ip = freshIp();
    for (let i = 0; i < AUTH_RATE_LIMITS.sendCode.max; i++) await server.requestCode(EMAIL, ip);

    const spoofed = await server.request('POST', '/v1/auth/email-otp/send-verification-otp', {
      body: { email: EMAIL, type: 'sign-in' },
      ip,
      headers: { [CLIENT_IP_HEADER]: '203.0.113.99', 'x-forwarded-for': '203.0.113.98' },
    });
    expect(spoofed.status).toBe(429);
  });

  it(`limits code verification to ${AUTH_RATE_LIMITS.verifyCode.max} attempts per minute per client`, async () => {
    const ip = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i <= AUTH_RATE_LIMITS.verifyCode.max; i++) {
      statuses.push((await server.verifyCode(`guess-${i}@example.com`, '123456', ip)).status);
    }
    expect(statuses.slice(0, AUTH_RATE_LIMITS.verifyCode.max).every((s) => s === 400)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it('keeps rate-limit state in the database, so a restart does not reset it', async () => {
    const ip = freshIp();
    await server.requestCode(EMAIL, ip);
    const rows = (await server.db.execute(sql`select key, count from rate_limit`)).rows as { key: string }[];
    expect(rows.some((r) => r.key.startsWith(`${ip}|`))).toBe(true);
  });
});

describe('sessions', () => {
  it('signs out by revoking the session on the server', async () => {
    const { cookie } = await server.signIn(EMAIL);

    const out = await server.request('POST', '/v1/auth/sign-out', { cookie, headers: { origin: 'fashionsaavy://' } });
    expect(out.status).toBe(200);

    expect((await server.request('GET', '/v1/garments', { cookie })).status).toBe(401);
    const session = await server.request('GET', '/v1/auth/get-session', { cookie });
    expect(session.body).toBeNull();
    expect((await server.db.execute(sql`select count(*)::int as n from session`)).rows[0]).toEqual({ n: 0 });
  });

  it('only revokes the session that signed out', async () => {
    const phone = await server.signIn(EMAIL);
    const tablet = await server.signIn(EMAIL);

    await server.request('POST', '/v1/auth/sign-out', { cookie: phone.cookie, headers: { origin: 'fashionsaavy://' } });
    expect((await server.request('GET', '/v1/garments', { cookie: phone.cookie })).status).toBe(401);
    expect((await server.request('GET', '/v1/garments', { cookie: tablet.cookie })).status).toBe(200);
  });

  it('rejects an expired session', async () => {
    const { cookie } = await server.signIn(EMAIL);
    await server.db.execute(sql`update session set expires_at = now() - interval '1 second'`);

    expect((await server.request('GET', '/v1/garments', { cookie })).status).toBe(401);
  });

  it('lasts 30 days from sign-in', async () => {
    await server.signIn(EMAIL);
    const [row] = (await server.db.execute(sql`select extract(epoch from (expires_at - created_at)) / 86400 as days from session`))
      .rows as { days: string }[];
    expect(Math.round(Number(row!.days))).toBe(30);
  });

  it('gives the same person the same account (and wardrobe) on every sign-in', async () => {
    const first = await server.signIn(EMAIL);
    await server.request('POST', '/v1/garments', { cookie: first.cookie, body: { category: 'top', name: 'Mine' } });

    const again = await server.signIn('ALICE@example.com');
    expect(again.userId).toBe(first.userId);
    const list = ListGarmentsResponseSchema.parse((await server.request('GET', '/v1/garments', { cookie: again.cookie })).body);
    expect(list.garments.map((g) => g.name)).toEqual(['Mine']);
  });
});

describe('ownership and photos under real sessions', () => {
  it("never shows a user another user's garment or photo links", async () => {
    const alice = await server.signIn(EMAIL);
    const bob = await server.signIn('bob@example.com');
    const imageId = await server.uploadPhoto(alice.cookie, await samplePhoto());
    const garment = GarmentSchema.parse(
      (await server.request('POST', '/v1/garments', { cookie: alice.cookie, body: { category: 'top', imageId } })).body,
    );

    expect((await server.request('GET', `/v1/garments/${garment.id}`, { cookie: bob.cookie })).status).toBe(404);
    const bobs = ListGarmentsResponseSchema.parse((await server.request('GET', '/v1/garments', { cookie: bob.cookie })).body);
    expect(bobs.garments).toEqual([]);
    // Bob can't attach Alice's photo to his own garment either.
    expect((await server.request('POST', '/v1/garments', { cookie: bob.cookie, body: { category: 'top', imageId } })).status).toBe(400);
  });

  it('issues upload tickets only to signed-in users, bound to their own account', async () => {
    expect((await server.request('POST', '/v1/garment-images')).status).toBe(401);

    const alice = await server.signIn(EMAIL);
    const bob = await server.signIn('bob@example.com');
    const imageId = await server.uploadPhoto(alice.cookie, await samplePhoto());
    const owner = (await server.db.execute(sql`select owner_id from garment_images where id = ${imageId}`)).rows[0];
    expect(owner).toEqual({ owner_id: alice.userId });
    expect(alice.userId).not.toBe(bob.userId);
  });
});

describe('development data created before sign-in existed', () => {
  it('stays in place, owned by its original development id, and is visible to no signed-in user', async () => {
    const devOwner = '11111111-1111-4111-8111-111111111111';
    await server.db.execute(
      sql`insert into garments (id, owner_id, category, name, attributes, status) values (gen_random_uuid(), ${devOwner}, 'top', 'Old dev shirt', '{}'::jsonb, 'confirmed')`,
    );

    const alice = await server.signIn(EMAIL);
    const list = ListGarmentsResponseSchema.parse((await server.request('GET', '/v1/garments', { cookie: alice.cookie })).body);
    expect(list.garments).toEqual([]);

    const rows = (await server.db.execute(sql`select owner_id, name from garments`)).rows;
    expect(rows).toEqual([{ owner_id: devOwner, name: 'Old dev shirt' }]);
  });
});
