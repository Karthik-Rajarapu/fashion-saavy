import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  /** Root for the embedded database, locally stored photos and the development email outbox. */
  DATA_DIR: z.string().min(1).default('.data'),
  /** HMAC secret for signed upload and read URLs. */
  STORAGE_SIGNING_SECRET: z.string().min(32).optional(),
  /** Better Auth secret: signs session cookies and hashes stored codes. Must stay stable across restarts. */
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  /** How sign-in codes are delivered. Only the development outbox exists yet; there is no production provider. */
  EMAIL_DELIVERY: z.enum(['dev-outbox']).default('dev-outbox'),
  /** Removed: identity now comes only from a verified session. Rejected so stale configs fail loudly. */
  DEV_AUTH: z.string().optional(),
});

export type Config = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  dataDir: string;
  signingSecret: string;
  authSecret: string;
  emailDelivery: 'dev-outbox';
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.parse(env);

  if (parsed.DEV_AUTH !== undefined) {
    throw new Error('DEV_AUTH has been removed: sign in with an email code instead. Delete it from your .env.');
  }

  if (parsed.NODE_ENV === 'production') {
    // No real email provider exists, so sign-in can't work for real users, and the development outbox must never
    // stand in for delivery. The embedded database and local-disk photo storage are development stand-ins too.
    throw new Error(
      'Production is not supported yet: no real email provider, production database or object storage adapter exists.',
    );
  }

  if (!parsed.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is required (at least 32 characters). See apps/server/.env.example.');
  }

  let signingSecret = parsed.STORAGE_SIGNING_SECRET;
  if (!signingSecret) {
    // Acceptable in development only: signed URLs simply stop working after a restart, and clients refetch.
    signingSecret = randomBytes(32).toString('hex');
    console.warn('STORAGE_SIGNING_SECRET is not set; using a random secret for this process.');
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    dataDir: parsed.DATA_DIR,
    signingSecret,
    authSecret: parsed.BETTER_AUTH_SECRET,
    emailDelivery: parsed.EMAIL_DELIVERY,
  };
}
