import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gutter, space } from './tokens';

type Props = {
  children: ReactNode;
  /** Tab screens draw under the status bar; stack screens with a native header don't need the top inset. */
  topInset?: boolean;
};

export function Screen({ children, topInset = true }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      // iOS: keep content behind the keyboard (e.g. the Stylist call to action) scrollable into view.
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.content, { paddingTop: (topInset ? insets.top : 0) + space.lg }]}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: gutter, paddingBottom: space.xxxl, gap: space.xl },
});
