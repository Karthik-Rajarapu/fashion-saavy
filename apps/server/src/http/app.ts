import { Hono } from 'hono';
import type { HealthResponse } from '@fashion-saavy/contracts';
import type { Auth } from '../modules/identity';
import type { WardrobeService } from '../modules/wardrobe';
import type { ObjectStorage } from '../platform/storage/local-disk-storage';
import { errorResponse, handleError } from './errors';
import { authRoutes } from './routes/auth';
import { fileRoutes } from './routes/files';
import { garmentRoutes } from './routes/garments';

export type AppDeps = {
  auth: Auth;
  wardrobe: WardrobeService;
  storage: ObjectStorage;
};

export function createApp({ auth, wardrobe, storage }: AppDeps) {
  const v1 = new Hono()
    .get('/health', (c) => c.json({ status: 'ok' } satisfies HealthResponse))
    .route('/', authRoutes(auth))
    .route('/', garmentRoutes({ wardrobe, auth }))
    .route('/', fileRoutes({ storage, wardrobe }));

  return new Hono()
    .route('/v1', v1)
    .notFound((c) => errorResponse(c, 404, 'not_found', 'Not found.'))
    .onError(handleError);
}
