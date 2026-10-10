import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { WardrobeService } from '../../modules/wardrobe';
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from '../../platform/images/process-photo';
import type { ObjectStorage } from '../../platform/storage/local-disk-storage';
import { errorResponse } from '../errors';

/**
 * Capability routes for the local-disk storage adapter, standing in for S3 presigned POST and GET URLs.
 * They take no session: the signed, expiring token in the path is the permission, exactly as with S3.
 */
export function fileRoutes({ storage, wardrobe }: { storage: ObjectStorage; wardrobe: WardrobeService }) {
  return new Hono()
    .post(
      '/uploads/:token',
      bodyLimit({
        // Room for multipart boundaries and headers around the file itself.
        maxSize: MAX_UPLOAD_BYTES + 64 * 1024,
        onError: (c) => errorResponse(c, 413, 'payload_too_large', 'The photo is larger than 10 MB.'),
      }),
      async (c) => {
        const claims = storage.verifyUploadToken(c.req.param('token'));
        if (!claims) return errorResponse(c, 403, 'forbidden', 'This upload link is invalid or has expired.');

        const body = await c.req.parseBody();
        const file = body.file;
        if (!(file instanceof File)) return errorResponse(c, 400, 'validation_failed', 'Attach the photo as "file".');
        if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
          return errorResponse(c, 415, 'unsupported_media_type', 'Only JPEG, PNG or WebP photos are supported.');
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          return errorResponse(c, 413, 'payload_too_large', 'The photo is larger than 10 MB.');
        }

        await wardrobe.receiveUpload(claims, Buffer.from(await file.arrayBuffer()));
        return c.body(null, 204);
      },
    )
    .get('/files/:token', async (c) => {
      const claims = storage.verifyReadToken(c.req.param('token'));
      if (!claims) return errorResponse(c, 403, 'forbidden', 'This link is invalid or has expired.');

      const data = await storage.read(claims.key);
      if (!data) return errorResponse(c, 404, 'not_found', 'File not found.');
      return c.body(new Uint8Array(data), 200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      });
    });
}
