import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors, fonts } from './tokens';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'kicker' | 'label';

type Props = TextProps & {
  variant?: Variant;
  tone?: 'ink' | 'muted' | 'accent' | 'onInk';
};

const toneColor = {
  ink: colors.ink,
  muted: colors.inkMuted,
  accent: colors.accent,
  onInk: colors.onInk,
} as const;

// Large display sizes cap their scaling so headlines stay on screen at the largest system text sizes.
const maxScale: Partial<Record<Variant, number>> = { display: 1.3, title: 1.5 };

export function AppText({ variant = 'body', tone = 'ink', style, ...rest }: Props) {
  return (
    <Text
      maxFontSizeMultiplier={maxScale[variant]}
      accessibilityRole={variant === 'display' || variant === 'title' ? 'header' : undefined}
      {...rest}
      style={[styles[variant], { color: toneColor[tone] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  kicker: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase' },
  label: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 20, fontWeight: '600' },
});
