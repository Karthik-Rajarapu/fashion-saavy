import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Rule } from '../../ui/Rule';
import { Screen } from '../../ui/Screen';
import { colors, gutter, radii, space } from '../../ui/tokens';
import { useWardrobeSummary, WARDROBE_CATEGORIES, type WardrobeCategory } from './wardrobe-state';

const STARTER_PIECES = [
  { title: 'The top you reach for most', note: 'A tee, shirt or kurti you wear without thinking.' },
  { title: 'Your everyday bottoms', note: 'Jeans, trousers or palazzos.' },
  { title: 'A layer', note: 'An overshirt, jacket or shrug.' },
  { title: 'One ethnic piece', note: 'A kurta or set you love wearing.' },
  { title: 'Something for occasions', note: 'What you would wear to a wedding or a dinner out.' },
] as const;

const SLOT_LABELS = ['Top', 'Bottom', 'Layer', 'Ethnic', 'Occasion', 'Any'] as const;

export function WardrobeScreen() {
  const router = useRouter();
  const { garmentCount } = useWardrobeSummary();
  const [category, setCategory] = useState<WardrobeCategory>('All');
  const addGarment = () => router.push('/add-garment');

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="display">Wardrobe</AppText>
          <AppText tone="muted">
            {garmentCount === 1 ? '1 piece' : `${garmentCount} pieces`} · clothing you own
          </AppText>
        </View>
        <Button label="Add" variant="secondary" accessibilityLabel="Add a garment" onPress={addGarment} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.fullBleed}
        contentContainerStyle={styles.filters}>
        {WARDROBE_CATEGORIES.map((name) => (
          <Chip key={name} label={name} selected={category === name} onPress={() => setCategory(name)} />
        ))}
      </ScrollView>

      <View style={styles.emptyIntro}>
        <AppText variant="title">
          {category === 'All' ? 'Nothing here yet.' : `No ${category.toLowerCase()} yet.`}
        </AppText>
        <AppText tone="muted">
          Your garments will appear here once you add them. Every piece you add is one the Stylist can use.
        </AppText>
      </View>

      <View
        style={styles.slots}
        accessible
        accessibilityLabel="Empty wardrobe. Your garments will fill this grid as you add them.">
        {SLOT_LABELS.map((label) => (
          <View key={label} style={styles.slot} importantForAccessibility="no-hide-descendants">
            <AppText variant="kicker" tone="muted">
              {label}
            </AppText>
          </View>
        ))}
      </View>

      <Button label="Add your first garment" onPress={addGarment} />

      <View style={styles.section}>
        <AppText variant="kicker">Start with five</AppText>
        <Rule strong />
        {STARTER_PIECES.map((piece, i) => (
          <View key={piece.title}>
            <View style={styles.starter}>
              <AppText variant="heading" tone="accent" style={styles.starterNumber}>
                {String(i + 1).padStart(2, '0')}
              </AppText>
              <View style={styles.starterText}>
                <AppText variant="heading">{piece.title}</AppText>
                <AppText variant="small" tone="muted">
                  {piece.note}
                </AppText>
              </View>
            </View>
            <Rule />
          </View>
        ))}
        <AppText variant="small" tone="muted">
          Clothing only for now. Shoes are coming later.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md },
  headerText: { flex: 1, gap: space.xs },
  fullBleed: { marginHorizontal: -gutter },
  filters: { paddingHorizontal: gutter, gap: space.sm },
  emptyIntro: { gap: space.sm },
  slots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  slot: {
    width: '48%',
    aspectRatio: 3 / 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.inkMuted,
    borderRadius: radii.sm,
    justifyContent: 'flex-end',
    padding: space.md,
  },
  section: { gap: space.md },
  starter: { flexDirection: 'row', gap: space.lg, paddingVertical: space.md },
  starterNumber: { width: 28 },
  starterText: { flex: 1, gap: 2 },
});
