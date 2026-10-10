import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { GARMENT_CATEGORIES } from '@fashion-saavy/contracts';
import type { StoredAttributes } from '../domain/attributes';

// Owner columns hold the authenticated user's id. There is no users table yet: Better Auth will own identity
// tables, and a foreign key is added when it lands (ARCHITECTURE.md §11).

export const garmentImages = pgTable(
  'garment_images',
  {
    id: uuid().primaryKey(),
    ownerId: uuid('owner_id').notNull(),
    status: text({ enum: ['pending', 'ready'] }).notNull(),
    displayKey: text('display_key'),
    thumbnailKey: text('thumbnail_key'),
    width: integer(),
    height: integer(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('garment_images_owner_idx').on(t.ownerId)],
);

export const garments = pgTable(
  'garments',
  {
    id: uuid().primaryKey(),
    ownerId: uuid('owner_id').notNull(),
    category: text({ enum: GARMENT_CATEGORIES }).notNull(),
    name: text(),
    attributes: jsonb().$type<StoredAttributes>().notNull().default({}),
    fitNote: text('fit_note'),
    status: text({ enum: ['draft', 'confirmed'] }).notNull(),
    // One photo belongs to at most one garment.
    imageId: uuid('image_id')
      .unique()
      .references(() => garmentImages.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('garments_owner_created_idx').on(t.ownerId, t.createdAt),
    // Clothing only: the database rejects categories outside the V1 list (no shoes).
    check('garments_category_check', sql.raw(`category in (${GARMENT_CATEGORIES.map((c) => `'${c}'`).join(', ')})`)),
  ],
);
