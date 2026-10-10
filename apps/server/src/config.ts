import { randomBytes } from 'node:crypto';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  /**
   * Development-only identity: trusts the `X-Dev-User-Id` header. Stands in for Better Auth until sign-in exists.
   * Never allowed in production.
   */
  DEV_AUTH: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  /** Root for the embedded database and locally stored photos. */
  DATA_DIR: z.string().min(1).default('.data'),
  /** HMAC secret for signed upload and read URLs. */
  STORAGE_SIGNING_SECRET: z.string().min(32).optional(),
});

export type Config = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  devAuth: boolean;
  dataDir: string;
  signingSecret: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.parse(env);

  if (parsed.NODE_ENV === 'production') {
    if (parsed.DEV_AUTH) throw new Error('DEV_AUTH must never be enabled in production.');
    // The embedded PGlite database and local-disk photo storage are development stand-ins (ARCHITECTURE.md §2).
    throw new Error('Production database and object storage adapters are not implemented yet.');
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
    devAuth: parsed.DEV_AUTH,
    dataDir: parsed.DATA_DIR,
    signingSecret,
  };
}
