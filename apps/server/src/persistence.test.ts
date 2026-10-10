import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { GarmentSchema, ListGarmentsResponseSchema } from '@fashion-saavy/contracts';
import { ALICE, createTestServer, samplePhoto } from './test/harness';

it('keeps garments and their photos across a server restart', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'fashion-saavy-persist-'));
  // A nested path that doesn't exist yet, like a fresh `.data/pglite` on first start.
  const databaseDir = join(dataDir, 'fresh', 'pglite');
  const storageDir = join(dataDir, 'uploads');

  try {
    const first = await createTestServer({ databaseDir, storageDir });
    const imageId = await first.uploadPhoto(ALICE, await samplePhoto());
    const created = GarmentSchema.parse(
      (await first.request('POST', '/v1/garments', { user: ALICE, body: { category: 'dress', name: 'Kept', imageId } })).body,
    );
    await first.close();

    const second = await createTestServer({ databaseDir, storageDir });
    try {
      const list = ListGarmentsResponseSchema.parse((await second.request('GET', '/v1/garments', { user: ALICE })).body);
      expect(list.garments).toHaveLength(1);
      expect(list.garments[0]).toMatchObject({ id: created.id, name: 'Kept', category: 'dress' });

      const photo = await second.app.request(list.garments[0]!.image!.displayUrl);
      expect(photo.status).toBe(200);
    } finally {
      await second.close();
    }
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
