import type { Garment, GarmentAttributeName, GarmentAttributes } from '@fashion-saavy/contracts';

type AttributeSource = 'user' | 'ai';

/** How attributes are stored: each value remembers who set it. */
export type StoredAttributes = Partial<{
  [K in GarmentAttributeName]: { value: NonNullable<GarmentAttributes[K]>; source: AttributeSource };
}>;

/**
 * Attributes submitted by the user replace the attribute set, and every submitted value is user-sourced:
 * confirmed user data is authoritative and AI proposals may never overwrite it (ARCHITECTURE.md §14).
 */
export function fromUserInput(input: GarmentAttributes): StoredAttributes {
  const stored: Record<string, { value: unknown; source: AttributeSource }> = {};
  for (const [name, value] of Object.entries(input)) {
    if (value !== undefined) stored[name] = { value, source: 'user' };
  }
  return stored as StoredAttributes;
}

export function toPublic(stored: StoredAttributes): Pick<Garment, 'attributes' | 'attributeSources'> {
  const attributes: Record<string, unknown> = {};
  const attributeSources: Record<string, AttributeSource> = {};
  for (const [name, entry] of Object.entries(stored)) {
    if (!entry) continue;
    attributes[name] = entry.value;
    attributeSources[name] = entry.source;
  }
  return {
    attributes: attributes as Garment['attributes'],
    attributeSources: attributeSources as Garment['attributeSources'],
  };
}
