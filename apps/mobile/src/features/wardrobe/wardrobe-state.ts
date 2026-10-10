/**
 * The user's wardrobe as the UI sees it.
 *
 * There is no garment persistence yet (no API, no local storage), so the wardrobe is always empty.
 * When the wardrobe API exists, this becomes a TanStack Query hook and screens keep the same shape.
 */
export type WardrobeSummary = { garmentCount: number };

export function useWardrobeSummary(): WardrobeSummary {
  return { garmentCount: 0 };
}

/**
 * Provisional browsing categories. The V1 garment taxonomy is an open product question
 * (docs/PRODUCT.md), so these are display filters only. Clothing only: no shoes in V1.
 */
export const WARDROBE_CATEGORIES = ['All', 'Tops', 'Bottoms', 'Ethnic wear', 'Dresses', 'Layers'] as const;

export type WardrobeCategory = (typeof WARDROBE_CATEGORIES)[number];
