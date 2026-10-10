import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GARMENT_CATEGORIES, type Garment, type GarmentCategory } from '@fashion-saavy/contracts';
import { errorMessage } from '../../api/client';
import { useGarments } from '../../api/garments';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Rule } from '../../ui/Rule';
import { Screen } from '../../ui/Screen';
import { colors, gutter, radii, space } from '../../ui/tokens';
import { CATEGORY_LABELS, pieceCount } from './wardrobe-state';

const STARTER_PIECES = [
  { title: 'The top you reach for most', note: 'A tee, shirt or kurti you wear without thinking.' },
  { title: 'Your everyday bottoms', note: 'Jeans, trousers or palazzos.' },
  { title: 'A layer', note: 'An overshirt, jacket or shrug.' },
  { title: 'One ethnic piece', note: 'A kurta or set you love wearing.' },
  { title: 'Something for occasions', note: 'What you would wear to a wedding or a dinner out.' },
] as const;

const SLOT_LABELS = ['Top', 'Bottom', 'Layer', 'Ethnic', 'Occasion', 'Any'] as const;

type Filter = 'all' | GarmentCategory;

export function WardrobeScreen() {
  const router = useRouter();
  const garments = useGarments();
  const [filter, setFilter] = useState<Filter>('all');
  const addGarment = () => router.push('/add-garment');

  const all = garments.data ?? [];
  const shown = filter === 'all' ? all : all.filter((g) => g.category === filter);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="display">Wardrobe</AppText>
          <AppText tone="muted">
            {garments.data ? `${pieceCount(all.length)} · clothing you own` : 'Clothing you own'}
          </AppText>
        </View>
        <Button label="Add" variant="secondary" accessibilityLabel="Add a garment" onPress={addGarment} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fullBleed} contentContainerStyle={styles.filters}>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {GARMENT_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={CATEGORY_LABELS[category].plural}
            selected={filter === category}
            onPress={() => setFilter(category)}
          />
        ))}
      </ScrollView>

      {garments.isPending ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.ink} />
          <AppText tone="muted">Loading your wardrobe…</AppText>
        </View>
      ) : garments.isError ? (
        <View style={styles.state}>
          <AppText variant="title">Couldn't load your wardrobe.</AppText>
          <AppText tone="muted">{errorMessage(garments.error)}</AppText>
          <Button label="Try again" onPress={() => void garments.refetch()} />
        </View>
      ) : all.length === 0 ? (
        <EmptyWardrobe filter={filter} onAdd={addGarment} />
      ) : shown.length === 0 ? (
        <View style={styles.state}>
          <AppText variant="title">No {CATEGORY_LABELS[filter as GarmentCategory].plural.toLowerCase()} yet.</AppText>
          <Button label="Add a garment" variant="secondary" onPress={addGarment} />
        </View>
      ) : (
        <View style={styles.grid}>
          {shown.map((garment) => (
            <GarmentTile
              key={garment.id}
              garment={garment}
              onPress={() => router.push({ pathname: '/garment/[id]', params: { id: garment.id } })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function GarmentTile({ garment, onPress }: { garment: Garment; onPress: () => void }) {
  const category = CATEGORY_LABELS[garment.category].singular;
  const title = garment.name ?? category;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={garment.name ? `${garment.name}, ${category}` : category}
      accessibilityHint="Opens the garment"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      {garment.image ? (
        <Image
          source={{ uri: garment.image.thumbnailUrl }}
          style={styles.tileImage}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.tileImage, styles.tileNoPhoto]} />
      )}
      <AppText variant="kicker" tone="muted">
        {category}
      </AppText>
      <AppText variant="small" numberOfLines={1}>
        {title}
      </AppText>
    </Pressable>
  );
}

function EmptyWardrobe({ filter, onAdd }: { filter: Filter; onAdd: () => void }) {
  return (
    <>
      <View style={styles.emptyIntro}>
        <AppText variant="title">
          {filter === 'all' ? 'Nothing here yet.' : `No ${CATEGORY_LABELS[filter].plural.toLowerCase()} yet.`}
        </AppText>
        <AppText tone="muted">
          Your garments will appear here once you add them. Every piece you add is one the Stylist can use.
        </AppText>
      </View>

      <View style={styles.grid} accessible accessibilityLabel="Empty wardrobe. Your garments will fill this grid as you add them.">
        {SLOT_LABELS.map((label) => (
          <View key={label} style={styles.slot} importantForAccessibility="no-hide-descendants">
            <AppText variant="kicker" tone="muted">
              {label}
            </AppText>
          </View>
        ))}
      </View>

      <Button label="Add your first garment" onPress={onAdd} />

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
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md },
  headerText: { flex: 1, gap: space.xs },
  fullBleed: { marginHorizontal: -gutter },
  filters: { paddingHorizontal: gutter, gap: space.sm },
  state: { gap: space.md, paddingVertical: space.lg },
  emptyIntro: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.lg },
  tile: { width: '48%', gap: space.xs },
  tileImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: radii.sm, backgroundColor: colors.sand },
  tileNoPhoto: { borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.7 },
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
