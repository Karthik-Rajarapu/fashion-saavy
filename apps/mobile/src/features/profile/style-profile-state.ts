/**
 * The user's Style Profile as the UI sees it.
 *
 * The onboarding questionnaire and profile API don't exist yet, so no profile has ever been saved.
 * When they do, this becomes a TanStack Query hook returning the active profile version.
 */
export type StyleProfileSummary = {
  direction: string;
  summary: string;
  preferences: readonly { label: string; value: string }[];
  dressesFor: readonly string[];
};

export function useStyleProfile(): StyleProfileSummary | null {
  return null;
}

/** Illustrates what a summary looks like. Always shown with a sample label, never as the user's profile. */
export const EXAMPLE_STYLE_PROFILE: StyleProfileSummary = {
  direction: 'Relaxed minimal, with a soft spot for colour',
  summary:
    'Clean lines and easy fits for everyday college days, then one confident colour or a well-cut kurta when the occasion calls for it.',
  preferences: [
    { label: 'Silhouettes', value: 'Relaxed tops, straight or wide bottoms' },
    { label: 'Colours', value: 'Earth tones, indigo, an accent of rust' },
    { label: 'Comfort', value: 'Breathable fabrics, nothing too fitted' },
  ],
  dressesFor: ['College', 'Weekends', 'Festive'],
};
