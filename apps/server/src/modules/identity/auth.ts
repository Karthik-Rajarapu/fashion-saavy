import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { expo } from '@better-auth/expo';
import type { Db } from '../../platform/db/client';
import { maskEmail, type EmailSender } from '../../platform/email/email-sender';
import * as schema from './infrastructure/schema';

/** Auth routes live under the versioned API (ARCHITECTURE.md §8). */
export const AUTH_BASE_PATH = '/v1/auth';

/**
 * The client IP for rate limiting. The HTTP layer overwrites this header with the connection's address on every
 * request, so a client can't choose its own rate-limit bucket (see routes/auth.ts).
 */
export const CLIENT_IP_HEADER = 'x-fashion-saavy-client-ip';

export const SIGN_IN_CODE = {
  length: 6,
  expiresInSeconds: 5 * 60,
  /** Wrong guesses allowed per code; the code is then invalidated and a new one must be requested. */
  allowedAttempts: 3,
} as const;

export const AUTH_RATE_LIMITS = {
  /** Code requests per client IP. */
  sendCode: { window: 60, max: 3 },
  /** Code verification attempts per client IP (on top of the per-code attempt limit). */
  verifyCode: { window: 60, max: 10 },
} as const;

const DAY = 24 * 60 * 60;

type Options = { db: Db; secret: string; emailSender: EmailSender; appScheme: string };

export function authOptions({ db, secret, emailSender, appScheme }: Options) {
  return {
    appName: 'Fashion Saavy',
    secret,
    basePath: AUTH_BASE_PATH,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    // Email codes are the only sign-in method (passwords and social sign-in are off by default).
    session: {
      expiresIn: 30 * DAY,
      // A session used within its last day is extended; sign-out deletes it server-side immediately.
      updateAge: DAY,
    },
    // The native app (via @better-auth/expo) and local Expo development are the only clients.
    trustedOrigins: [`${appScheme}://`, 'exp://'],
    rateLimit: {
      // Off by default outside production in Better Auth; always on here.
      enabled: true,
      // Survives restarts and isn't per-process.
      storage: 'database',
      customRules: {
        '/email-otp/send-verification-otp': AUTH_RATE_LIMITS.sendCode,
        '/sign-in/email-otp': AUTH_RATE_LIMITS.verifyCode,
      },
    },
    advanced: {
      // Owner columns are UUIDs (garments.owner_id).
      database: { generateId: 'uuid' },
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    telemetry: { enabled: false },
    plugins: [
      expo(),
      emailOTP({
        otpLength: SIGN_IN_CODE.length,
        expiresIn: SIGN_IN_CODE.expiresInSeconds,
        allowedAttempts: SIGN_IN_CODE.allowedAttempts,
        // Only a hash is stored; a database leak doesn't reveal live codes.
        storeOTP: 'hashed',
        // Unknown emails get an account on first successful verification, so the response to a code request is
        // the same for known and unknown addresses (no account enumeration).
        disableSignUp: false,
        rateLimit: AUTH_RATE_LIMITS.sendCode,
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== 'sign-in') return; // only sign-in codes are used
          // Not awaited by the response path, so delivery time doesn't leak whether an address is known.
          void emailSender
            .sendSignInCode({ to: email, code: otp, expiresInMinutes: SIGN_IN_CODE.expiresInSeconds / 60 })
            .catch((error: unknown) => {
              console.error(`Sign-in code delivery failed for ${maskEmail(email)}:`, error instanceof Error ? error.message : error);
            });
        },
      }),
    ],
  } satisfies BetterAuthOptions;
}

export function createAuth(options: Options) {
  return betterAuth(authOptions(options));
}

export type Auth = ReturnType<typeof createAuth>;
