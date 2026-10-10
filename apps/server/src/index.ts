import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { loadConfig } from './config';
import { createApp } from './http/app';
import { createAuth } from './modules/identity';
import { createWardrobeService } from './modules/wardrobe';
import { openDatabase } from './platform/db/client';
import { createDevOutboxSender } from './platform/email/email-sender';
import { createLocalDiskStorage } from './platform/storage/local-disk-storage';

/** The mobile app's URL scheme (apps/mobile/app.config.ts), trusted as an origin for its auth requests. */
const APP_SCHEME = 'fashionsaavy';

const config = loadConfig();
const database = await openDatabase(join(config.dataDir, 'pglite'));
const storage = createLocalDiskStorage({ rootDir: join(config.dataDir, 'uploads'), secret: config.signingSecret });
const wardrobe = createWardrobeService({ db: database.db, storage });

// loadConfig refuses production, so the development outbox can never stand in for real delivery.
const emailSender = createDevOutboxSender(join(config.dataDir, 'dev-outbox', 'sign-in-codes.jsonl'));
console.warn(`Email delivery: development outbox only. Sign-in codes are written to ${config.dataDir}/dev-outbox/, not emailed.`);

const auth = createAuth({ db: database.db, secret: config.authSecret, emailSender, appScheme: APP_SCHEME });

const server = serve({ fetch: createApp({ auth, wardrobe, storage }).fetch, port: config.port }, (info) => {
  console.log(`API listening on port ${info.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void database.close().finally(() => process.exit(0));
    });
  });
}
