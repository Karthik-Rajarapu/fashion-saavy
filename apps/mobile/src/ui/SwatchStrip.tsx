import { StyleSheet, View, type ViewStyle } from 'react-native';
import { swatches, type SwatchName } from './tokens';

type Props = {
  palette: readonly SwatchName[];
  height?: number;
  style?: ViewStyle;
};

/** Flat bands of colour standing in for fabric: decorative, so hidden from screen readers. */
export function SwatchStrip({ palette, height = 12, style }: Props) {
  return (
    <View style={[styles.strip, { height }, style]} accessible={false} importantForAccessibility="no-hide-descendants">
      {palette.map((name, i) => (
        <View key={`${name}-${i}`} style={[styles.band, { backgroundColor: swatches[name] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row' },
  band: { flex: 1 },
});
