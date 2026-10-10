import sharp from 'sharp';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const DISPLAY_EDGE = 1600;
const THUMBNAIL_EDGE = 480;

export class UnsupportedImageError extends Error {}

export type ProcessedPhoto = {
  display: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
};

/**
 * Normalizes an uploaded garment photo. The original is never stored: only re-encoded JPEG derivatives,
 * which carry no EXIF/GPS metadata (sharp drops metadata unless asked to keep it). Orientation is applied
 * to the pixels first so dropping EXIF doesn't rotate the photo.
 */
export async function processGarmentPhoto(input: Buffer): Promise<ProcessedPhoto> {
  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: 50_000_000 }).metadata()).format;
  } catch {
    throw new UnsupportedImageError('The file is not a readable image.');
  }
  if (format !== 'jpeg' && format !== 'png' && format !== 'webp') {
    throw new UnsupportedImageError('Only JPEG, PNG or WebP photos are supported.');
  }

  const oriented = sharp(input, { limitInputPixels: 50_000_000 }).rotate();
  const display = await oriented
    .clone()
    .resize(DISPLAY_EDGE, DISPLAY_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const thumbnail = await oriented
    .clone()
    .resize(THUMBNAIL_EDGE, THUMBNAIL_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  return { display: display.data, thumbnail, width: display.info.width, height: display.info.height };
}
