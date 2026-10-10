import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../../../platform/db/client';
import { garmentImages, garments } from './schema';

export type GarmentRow = typeof garments.$inferSelect;
export type GarmentImageRow = typeof garmentImages.$inferSelect;
export type GarmentWithImage = { garment: GarmentRow; image: GarmentImageRow | null };

/**
 * Every query is scoped by owner. There is deliberately no unscoped read or write path for user data:
 * another user's garment is indistinguishable from a missing one (ARCHITECTURE.md §11).
 */
export function createGarmentRepository(db: Db) {
  const withImage = () =>
    db
      .select({ garment: garments, image: garmentImages })
      .from(garments)
      .leftJoin(garmentImages, eq(garments.imageId, garmentImages.id));

  return {
    list(ownerId: string): Promise<GarmentWithImage[]> {
      return withImage().where(eq(garments.ownerId, ownerId)).orderBy(desc(garments.createdAt), desc(garments.id));
    },

    async find(ownerId: string, id: string): Promise<GarmentWithImage | null> {
      const [row] = await withImage().where(and(eq(garments.ownerId, ownerId), eq(garments.id, id)));
      return row ?? null;
    },

    async insert(values: typeof garments.$inferInsert): Promise<void> {
      await db.insert(garments).values(values);
    },

    async update(ownerId: string, id: string, values: Partial<typeof garments.$inferInsert>): Promise<void> {
      await db
        .update(garments)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(garments.ownerId, ownerId), eq(garments.id, id)));
    },

    async delete(ownerId: string, id: string): Promise<void> {
      await db.delete(garments).where(and(eq(garments.ownerId, ownerId), eq(garments.id, id)));
    },

    async insertPendingImage(ownerId: string, id: string): Promise<void> {
      await db.insert(garmentImages).values({ id, ownerId, status: 'pending' });
    },

    async findImage(ownerId: string, id: string): Promise<GarmentImageRow | null> {
      const [row] = await db
        .select()
        .from(garmentImages)
        .where(and(eq(garmentImages.ownerId, ownerId), eq(garmentImages.id, id)));
      return row ?? null;
    },

    async isImageAttached(imageId: string): Promise<boolean> {
      const [row] = await db.select({ id: garments.id }).from(garments).where(eq(garments.imageId, imageId));
      return row !== undefined;
    },

    async markImageReady(
      ownerId: string,
      id: string,
      values: { displayKey: string; thumbnailKey: string; width: number; height: number },
    ): Promise<void> {
      await db
        .update(garmentImages)
        .set({ ...values, status: 'ready' })
        .where(and(eq(garmentImages.ownerId, ownerId), eq(garmentImages.id, id)));
    },

    async deleteImage(ownerId: string, id: string): Promise<void> {
      await db.delete(garmentImages).where(and(eq(garmentImages.ownerId, ownerId), eq(garmentImages.id, id)));
    },
  };
}

export type GarmentRepository = ReturnType<typeof createGarmentRepository>;
