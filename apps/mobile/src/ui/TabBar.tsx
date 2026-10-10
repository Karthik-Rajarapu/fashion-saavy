import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { colors, minTouch, space } from './tokens';

/**
 * Typographic tab bar: four words, no icons, so navigation stays secondary to the content.
 * The active tab is marked by an ink rule and heavier type, not by colour alone.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key]?.options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={onPress}
            style={styles.tab}>
            <View style={[styles.marker, focused && styles.markerActive]} />
            <AppText variant="kicker" tone={focused ? 'ink' : 'muted'} style={focused && styles.activeLabel}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, minHeight: minTouch + space.sm, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  marker: { width: 20, height: 2, backgroundColor: 'transparent' },
  markerActive: { backgroundColor: colors.ink },
  activeLabel: { fontWeight: '800' },
});
