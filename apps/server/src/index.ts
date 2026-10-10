import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { loadConfig } from './config';
import { createApp } from './http/app';
import { createWardrobeService } from './modules/wardrobe';
import { openDatabase } from './platform/db/client';
import { createLocalDiskStorage } from './platform/storage/local-disk-storage';

const config = loadConfig();
const database = await openDatabase(join(config.dataDir, 'pglite'));
const storage = createLocalDiskStorage({ rootDir: join(config.dataDir, 'uploads'), secret: config.signingSecret });
const wardrobe = createWardrobeService({ db: database.db, storage });

if (config.devAuth) {
  console.warn('DEV_AUTH is on: the X-Dev-User-Id header is trusted as identity. Development only.');
}

const server = serve({ fetch: createApp({ devAuth: config.devAuth, wardrobe, storage }).fetch, port: config.port }, (info) => {
  console.log(`API listening on port ${info.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void database.close().finally(() => process.exit(0));
    });
  });
}
