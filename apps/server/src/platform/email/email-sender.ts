import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export type SignInCodeEmail = { to: string; code: string; expiresInMinutes: number };

/** Delivers sign-in codes. Production needs a real provider adapter, which doesn't exist yet. */
export interface EmailSender {
  /** Identifies the delivery path in logs and checks; never "production" for a stand-in. */
  readonly kind: 'dev-outbox' | 'test';
  sendSignInCode(email: SignInCodeEmail): Promise<void>;
}

/** "a•••@example.com": enough to tell addresses apart in logs without recording them. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}•••@${domain}`;
}

/**
 * Development only: nothing is delivered. Each code is appended to a local outbox file (gitignored, under the
 * data directory) so a developer can sign in on a device. Config refuses this sender in production.
 */
export function createDevOutboxSender(outboxFile: string): EmailSender {
  return {
    kind: 'dev-outbox',
    async sendSignInCode({ to, code, expiresInMinutes }) {
      await mkdir(dirname(outboxFile), { recursive: true });
      const entry = { to, subject: 'Your Fashion Saavy sign-in code', code, expiresInMinutes, sentAt: new Date().toISOString() };
      await appendFile(outboxFile, `${JSON.stringify(entry)}\n`);
      // The code itself is never logged.
      console.log(`[dev-outbox] Sign-in code for ${maskEmail(to)} written to ${outboxFile}. NOT delivered by email.`);
    },
  };
}
