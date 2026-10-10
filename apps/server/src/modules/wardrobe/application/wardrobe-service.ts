import { randomUUID } from 'node:crypto';
import type {
  CreateGarmentRequest,
  Garment,
  ImageUploadTicket,
  UpdateGarmentRequest,
} from '@fashion-saavy/contracts';
import { isUniqueViolation, type Db } from '../../../platform/db/client';
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, processGarmentPhoto } from '../../../platform/images/process-photo';
import type { ObjectStorage } from '../../../platform/storage/local-disk-storage';
import { fromUserInput, toPublic } from '../domain/attributes';
import { ConflictError, InvalidRequestError, NotFoundError } from '../domain/errors';
import {
  createGarmentRepository,
  type GarmentImageRow,
  type GarmentWithImage,
} from '../infrastructure/garment-repository';

/** Who is asking, and the origin their signed URLs must point at. */
export type RequestContext = { userId: string; origin: string };

const READ_URL_TTL_MS = 60 * 60 * 1000;
const UPLOAD_URL_TTL_MS = 15 * 60 * 1000;

export function createWardrobeService({ db, storage }: { db: Db; storage: ObjectStorage }) {
  const repo = createGarmentRepository(db);

  function toGarment({ garment, image }: GarmentWithImage, origin: string): Garment {
    let publicImage: Garment['image'] = null;
    if (image?.status === 'ready' && image.displayKey && image.thumbnailKey) {
      const display = storage.createReadUrl(image.displayKey, origin, READ_URL_TTL_MS);
      const thumbnail = storage.createReadUrl(image.thumbnailKey, origin, READ_URL_TTL_MS);
      publicImage = {
        id: image.id,
        displayUrl: display.url,
        thumbnailUrl: thumbnail.url,
        expiresAt: display.expiresAt.toISOString(),
      };
    }
    return {
      id: garment.id,
      category: garment.category,
      name: garment.name,
      ...toPublic(garment.attributes),
      fitNote: garment.fitNote,
      status: garment.status,
      image: publicImage,
      createdAt: garment.createdAt.toISOString(),
      updatedAt: garment.updatedAt.toISOString(),
    };
  }

  async function assertAttachable(ownerId: string, imageId: string) {
    const image = await repo.findImage(ownerId, imageId);
    if (!image) throw new InvalidRequestError('imageId does not refer to a photo you uploaded.');
    if (image.status !== 'ready') throw new ConflictError('The photo upload has not finished.');
    if (await repo.isImageAttached(imageId)) throw new ConflictError('This photo already belongs to another garment.');
  }

  async function removeImage(ownerId: string, image: GarmentImageRow) {
    await repo.deleteImage(ownerId, image.id);
    await storage.delete([image.displayKey, image.thumbnailKey].filter((key): key is string => key !== null));
  }

  async function get(ctx: RequestContext, id: string): Promise<Garment> {
    const row = await repo.find(ctx.userId, id);
    if (!row) throw new NotFoundError('Garment not found.');
    return toGarment(row, ctx.origin);
  }

  async function writeOrConflict(write: () => Promise<void>) {
    try {
      await write();
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('This photo already belongs to another garment.');
      throw error;
    }
  }

  return {
    async list(ctx: RequestContext): Promise<Garment[]> {
      return (await repo.list(ctx.userId)).map((row) => toGarment(row, ctx.origin));
    },

    get,

    async create(ctx: RequestContext, input: CreateGarmentRequest): Promise<Garment> {
      if (input.imageId) await assertAttachable(ctx.userId, input.imageId);
      const id = randomUUID();
      await writeOrConflict(() =>
        repo.insert({
          id,
          ownerId: ctx.userId,
          category: input.category,
          name: input.name ?? null,
          attributes: fromUserInput(input.attributes ?? {}),
          fitNote: input.fitNote ?? null,
          // Every field here was entered by the user, so the garment is confirmed on save.
          status: 'confirmed',
          imageId: input.imageId ?? null,
        }),
      );
      return get(ctx, id);
    },

    async update(ctx: RequestContext, id: string, patch: UpdateGarmentRequest): Promise<Garment> {
      const current = await repo.find(ctx.userId, id);
      if (!current) throw new NotFoundError('Garment not found.');

      const replacesImage = patch.imageId !== undefined && patch.imageId !== current.garment.imageId;
      if (replacesImage && patch.imageId) await assertAttachable(ctx.userId, patch.imageId);

      await writeOrConflict(() =>
        repo.update(ctx.userId, id, {
          ...(patch.category !== undefined && { category: patch.category }),
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.attributes !== undefined && { attributes: fromUserInput(patch.attributes) }),
          ...(patch.fitNote !== undefined && { fitNote: patch.fitNote }),
          ...(patch.imageId !== undefined && { imageId: patch.imageId }),
        }),
      );
      if (replacesImage && current.image) await removeImage(ctx.userId, current.image);
      return get(ctx, id);
    },

    async remove(ctx: RequestContext, id: string): Promise<void> {
      const current = await repo.find(ctx.userId, id);
      if (!current) throw new NotFoundError('Garment not found.');
      await repo.delete(ctx.userId, id);
      if (current.image) await removeImage(ctx.userId, current.image);
    },

    async requestImageUpload(ctx: RequestContext): Promise<ImageUploadTicket> {
      const imageId = randomUUID();
      await repo.insertPendingImage(ctx.userId, imageId);
      const upload = storage.createUploadUrl({ imageId, ownerId: ctx.userId }, ctx.origin, UPLOAD_URL_TTL_MS);
      return {
        imageId,
        url: upload.url,
        fields: {},
        fileField: 'file',
        maxBytes: MAX_UPLOAD_BYTES,
        acceptedTypes: [...ACCEPTED_IMAGE_TYPES],
        expiresAt: upload.expiresAt.toISOString(),
      };
    },

    /** Stores the derivatives of a photo uploaded with a valid upload token. */
    async receiveUpload(claims: { imageId: string; ownerId: string }, file: Buffer): Promise<void> {
      const image = await repo.findImage(claims.ownerId, claims.imageId);
      if (!image) throw new NotFoundError('This upload no longer exists.');
      if (image.status !== 'pending') throw new ConflictError('This photo has already been uploaded.');

      const photo = await processGarmentPhoto(file);
      const base = `users/${claims.ownerId}/garment-images/${claims.imageId}`;
      const displayKey = `${base}/display.jpg`;
      const thumbnailKey = `${base}/thumbnail.jpg`;
      await storage.put(displayKey, photo.display);
      await storage.put(thumbnailKey, photo.thumbnail);
      await repo.markImageReady(claims.ownerId, claims.imageId, {
        displayKey,
        thumbnailKey,
        width: photo.width,
        height: photo.height,
      });
    },
  };
}

export type WardrobeService = ReturnType<typeof createWardrobeService>;
