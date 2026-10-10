import { Platform } from 'react-native';

/**
 * Fashion Saavy design tokens.
 *
 * Direction: an editorial fashion magazine printed on warm paper. Ink-dark type, hairline rules,
 * flat colour fields instead of photography, and one vermilion accent used sparingly.
 * Text colours keep at least 4.5:1 contrast against `paper` and `sand`.
 */
export const colors = {
  paper: '#F6F1EA',
  sand: '#EDE4D8',
  ink: '#1B1714',
  inkMuted: '#5E554D',
  line: '#D9CEC1',
  accent: '#A63A1F',
  onInk: '#F6F1EA',
  onAccent: '#FFFFFF',
} as const;

/** Decorative fabric colours for swatches and colour fields. Never used for text. */
export const swatches = {
  ivory: '#EFE7DA',
  indigo: '#2B3A67',
  saffron: '#D98E2B',
  rust: '#A4442A',
  sage: '#8A9A7B',
  rose: '#C98A86',
  charcoal: '#3A3633',
  camel: '#C19A6B',
} as const;

export type SwatchName = keyof typeof swatches;

export const fonts = {
  /** Display serif. Uses fonts every device already has; a licensed typeface can replace it via expo-font later. */
  serif: Platform.select({ ios: 'Didot', default: 'serif' }),
  sans: Platform.select({ ios: 'System', default: 'sans-serif' }),
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Gutter used by every screen, so edges line up across destinations. */
export const gutter = 20;

export const radii = {
  none: 0,
  sm: 2,
  pill: 999,
} as const;

/** Minimum touch target (Android guidance is 48dp; iOS 44pt). */
export const minTouch = 48;
