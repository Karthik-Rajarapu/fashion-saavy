import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, minTouch, radii, space } from './tokens';

const CHIP_HEIGHT = 40;

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** A selectable filter or option. Selection is shown by fill and weight, never by colour alone. */
export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      // The chip is drawn 40 tall; the slop brings the touch target to the 48 minimum.
      hitSlop={{ top: (minTouch - CHIP_HEIGHT) / 2, bottom: (minTouch - CHIP_HEIGHT) / 2 }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}>
      <AppText variant="small" tone={selected ? 'onInk' : 'ink'} style={selected && styles.selectedText}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: CHIP_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  selected: { backgroundColor: colors.ink },
  selectedText: { fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
