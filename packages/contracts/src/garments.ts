import { z } from 'zod';

/**
 * Provisional V1 garment categories. Clothing only: shoes are out of scope for V1.
 * The final taxonomy is an open product question (docs/PRODUCT.md); extend this list additively.
 */
export const GARMENT_CATEGORIES = ['top', 'bottom', 'ethnic', 'dress', 'layer'] as const;
export const GarmentCategorySchema = z.enum(GARMENT_CATEGORIES);
export type GarmentCategory = z.infer<typeof GarmentCategorySchema>;

export const GARMENT_OCCASIONS = ['college', 'everyday', 'weekend', 'festive', 'evening', 'formal'] as const;
export const GarmentOccasionSchema = z.enum(GARMENT_OCCASIONS);
export type GarmentOccasion = z.infer<typeof GarmentOccasionSchema>;

const shortText = (max: number) => z.string().trim().min(1).max(max);

/** Editable, descriptive attributes. Every field is optional; the user fills in what they know. */
export const GarmentAttributesSchema = z
  .object({
    color: shortText(40).optional(),
    pattern: shortText(40).optional(),
    material: shortText(40).optional(),
    occasions: z.array(GarmentOccasionSchema).max(GARMENT_OCCASIONS.length).optional(),
  })
  .strict();
export type GarmentAttributes = z.infer<typeof GarmentAttributesSchema>;
export type GarmentAttributeName = keyof GarmentAttributes;

/** Who set each attribute. AI-proposed values never overwrite user-confirmed ones (ARCHITECTURE.md §14). */
export const AttributeSourceSchema = z.enum(['user', 'ai']);

export const GarmentImageSchema = z.object({
  id: z.uuid(),
  /** Short-lived signed URLs; never cache them as identifiers. Use `id` for that. */
  displayUrl: z.url(),
  thumbnailUrl: z.url(),
  expiresAt: z.iso.datetime(),
});
export type GarmentImage = z.infer<typeof GarmentImageSchema>;

/**
 * A garment as returned by the API. Ownership is not part of the payload: the server derives the owner
 * from the authenticated session and never accepts it from a client.
 */
export const GarmentSchema = z.object({
  id: z.uuid(),
  category: GarmentCategorySchema,
  name: z.string().nullable(),
  attributes: GarmentAttributesSchema,
  attributeSources: z.partialRecord(z.enum(['color', 'pattern', 'material', 'occasions']), AttributeSourceSchema),
  /** Null means the garment fits as expected (the default assumption). */
  fitNote: z.string().nullable(),
  status: z.enum(['draft', 'confirmed']),
  image: GarmentImageSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Garment = z.infer<typeof GarmentSchema>;

export const CreateGarmentRequestSchema = z
  .object({
    category: GarmentCategorySchema,
    name: shortText(80).optional(),
    attributes: GarmentAttributesSchema.optional(),
    fitNote: shortText(200).optional(),
    /** An image the same user uploaded through `POST /v1/garment-images`. */
    imageId: z.uuid().optional(),
  })
  .strict();
export type CreateGarmentRequest = z.infer<typeof CreateGarmentRequestSchema>;

/** Partial update. `null` clears a field; `attributes` replaces the whole attribute set. */
export const UpdateGarmentRequestSchema = z
  .object({
    category: GarmentCategorySchema,
    name: shortText(80).nullable(),
    attributes: GarmentAttributesSchema,
    fitNote: shortText(200).nullable(),
    imageId: z.uuid().nullable(),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });
export type UpdateGarmentRequest = z.infer<typeof UpdateGarmentRequestSchema>;

export const ListGarmentsResponseSchema = z.object({ garments: z.array(GarmentSchema) });
export type ListGarmentsResponse = z.infer<typeof ListGarmentsResponseSchema>;

/**
 * Response of `POST /v1/garment-images`: where and how to upload the photo. Shaped like an S3 presigned POST,
 * so the storage backend can change without changing clients: send `multipart/form-data` to `url` with every
 * entry of `fields` plus the file under `fileField`.
 */
export const ImageUploadTicketSchema = z.object({
  imageId: z.uuid(),
  url: z.url(),
  fields: z.record(z.string(), z.string()),
  fileField: z.string(),
  maxBytes: z.number().int().positive(),
  acceptedTypes: z.array(z.string()),
  expiresAt: z.iso.datetime(),
});
export type ImageUploadTicket = z.infer<typeof ImageUploadTicketSchema>;
