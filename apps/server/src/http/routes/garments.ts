import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { CreateGarmentRequestSchema, UpdateGarmentRequestSchema } from '@fashion-saavy/contracts';
import { NotFoundError, type RequestContext, type WardrobeService } from '../../modules/wardrobe';
import { readJson } from '../errors';
import { requireUser, type AppEnv } from '../identity';

function requestContext(c: Context<AppEnv>): RequestContext {
  return { userId: c.get('userId'), origin: new URL(c.req.url).origin };
}

// A malformed id can't match any garment, so it's reported exactly like a missing one.
function garmentId(c: Context<AppEnv>): string {
  const id = z.uuid().safeParse(c.req.param('id'));
  if (!id.success) throw new NotFoundError('Garment not found.');
  return id.data.toLowerCase();
}

export function garmentRoutes({ wardrobe, devAuth }: { wardrobe: WardrobeService; devAuth: boolean }) {
  const user = requireUser({ devAuth });

  return new Hono<AppEnv>()
    .get('/garments', user, async (c) => c.json({ garments: await wardrobe.list(requestContext(c)) }))
    .post('/garments', user, async (c) => {
      const input = await readJson(c, CreateGarmentRequestSchema);
      return c.json(await wardrobe.create(requestContext(c), input), 201);
    })
    .get('/garments/:id', user, async (c) => c.json(await wardrobe.get(requestContext(c), garmentId(c))))
    .patch('/garments/:id', user, async (c) => {
      const id = garmentId(c);
      const patch = await readJson(c, UpdateGarmentRequestSchema);
      return c.json(await wardrobe.update(requestContext(c), id, patch));
    })
    .delete('/garments/:id', user, async (c) => {
      await wardrobe.remove(requestContext(c), garmentId(c));
      return c.body(null, 204);
    })
    .post('/garment-images', user, async (c) => c.json(await wardrobe.requestImageUpload(requestContext(c)), 201));
}
