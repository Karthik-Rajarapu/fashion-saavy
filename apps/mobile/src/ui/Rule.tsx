import { StyleSheet, View } from 'react-native';
import { colors } from './tokens';

/** Hairline divider, the main structural device in place of cards. */
export function Rule({ strong = false }: { strong?: boolean }) {
  return <View style={[styles.rule, strong && styles.strong]} />;
}

const styles = StyleSheet.create({
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  strong: { height: 1, backgroundColor: colors.ink },
});
