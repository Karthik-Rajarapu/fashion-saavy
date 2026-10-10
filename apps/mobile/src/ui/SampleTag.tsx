import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radii, space } from './tokens';

/** Marks illustrative content so it is never mistaken for the user's real, saved data. */
export function SampleTag({ label = 'Sample' }: { label?: string }) {
  return (
    <View style={styles.tag}>
      <AppText variant="kicker" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.inkMuted,
    borderRadius: radii.sm,
  },
});
