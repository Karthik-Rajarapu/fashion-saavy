import type { GarmentCategory, GarmentOccasion } from '@fashion-saavy/contracts';
import { useGarments } from '../../api/garments';

/**
 * The user's wardrobe as other screens see it, from the API (persisted server-side).
 * `garmentCount` is null while loading or after an error, so screens never claim an empty wardrobe they
 * haven't confirmed.
 */
export type WardrobeSummary = { garmentCount: number | null; isError: boolean };

export function useWardrobeSummary(): WardrobeSummary {
  const garments = useGarments();
  return { garmentCount: garments.data?.length ?? null, isError: garments.isError };
}

/**
 * Display labels for the provisional V1 categories (contracts). The final taxonomy is an open product
 * question (docs/PRODUCT.md). Clothing only: no shoes in V1.
 */
export const CATEGORY_LABELS: Record<GarmentCategory, { plural: string; singular: string }> = {
  top: { plural: 'Tops', singular: 'Top' },
  bottom: { plural: 'Bottoms', singular: 'Bottom' },
  ethnic: { plural: 'Ethnic wear', singular: 'Ethnic wear' },
  dress: { plural: 'Dresses', singular: 'Dress' },
  layer: { plural: 'Layers', singular: 'Layer' },
};

export const OCCASION_LABELS: Record<GarmentOccasion, string> = {
  college: 'College',
  everyday: 'Everyday',
  weekend: 'Weekend',
  festive: 'Festive',
  evening: 'Evening',
  formal: 'Formal',
};

export function pieceCount(count: number): string {
  return count === 1 ? '1 piece' : `${count} pieces`;
}
