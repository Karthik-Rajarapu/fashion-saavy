import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { AppText } from './AppText';
import { colors, minTouch, radii, space } from './tokens';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'link';
};

export function Button({ label, variant = 'primary', ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={variant === 'link' ? 8 : undefined}
      {...rest}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed]}>
      <AppText variant="label" tone={variant === 'primary' ? 'onInk' : 'ink'} style={variant === 'link' && styles.linkText}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouch,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    borderRadius: radii.sm,
  },
  primary: { backgroundColor: colors.ink },
  secondary: { borderWidth: 1, borderColor: colors.ink },
  link: { paddingHorizontal: 0, alignItems: 'flex-start' },
  linkText: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.7 },
});
