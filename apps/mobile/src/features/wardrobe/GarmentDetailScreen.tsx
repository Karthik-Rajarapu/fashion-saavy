import { ActivityIndicator, Alert, Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Garment } from '@fashion-saavy/contracts';
import { ApiError, errorMessage } from '../../api/client';
import { useDeleteGarment, useGarment } from '../../api/garments';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Rule } from '../../ui/Rule';
import { Screen } from '../../ui/Screen';
import { colors, radii, space } from '../../ui/tokens';
import { CATEGORY_LABELS, OCCASION_LABELS } from './wardrobe-state';

export function GarmentDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const garment = useGarment(id);
  const remove = useDeleteGarment(id);

  if (garment.isPending) {
    return (
      <Screen topInset={false}>
        <ActivityIndicator color={colors.ink} accessibilityLabel="Loading garment" />
      </Screen>
    );
  }
  if (garment.isError) {
    const missing = garment.error instanceof ApiError && garment.error.code === 'not_found';
    return (
      <Screen topInset={false}>
        <AppText variant="title">{missing ? 'This garment is no longer in your wardrobe.' : "Couldn't load this garment."}</AppText>
        {!missing && <AppText tone="muted">{errorMessage(garment.error)}</AppText>}
        {!missing && <Button label="Try again" onPress={() => void garment.refetch()} />}
        <Button label="Back to wardrobe" variant="secondary" onPress={() => router.dismissTo('/wardrobe')} />
      </Screen>
    );
  }

  const g = garment.data;
  const label = CATEGORY_LABELS[g.category].singular;

  function confirmDelete() {
    Alert.alert('Delete this garment?', 'It and its photo will be removed from your wardrobe.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove.mutate(undefined, { onSuccess: () => router.dismissTo('/wardrobe') }),
      },
    ]);
  }

  return (
    <Screen topInset={false}>
      {g.image ? (
        <Image
          source={{ uri: g.image.displayUrl }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityLabel={`Photo of ${g.name ?? label}`}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.photo, styles.noPhoto]}>
          <AppText variant="kicker" tone="muted">
            No photo
          </AppText>
        </View>
      )}

      <View style={styles.header}>
        <AppText variant="kicker" tone="accent">
          {label}
        </AppText>
        <AppText variant="display">{g.name ?? label}</AppText>
      </View>

      <View style={styles.section}>
        <Rule strong />
        {detailRows(g).map(([title, value]) => (
          <View key={title}>
            <View style={styles.detail}>
              <AppText variant="kicker" tone="muted" style={styles.detailLabel}>
                {title}
              </AppText>
              <AppText style={styles.detailValue}>{value}</AppText>
            </View>
            <Rule />
          </View>
        ))}
      </View>

      {remove.isError && <AppText tone="accent">{errorMessage(remove.error)}</AppText>}
      <View style={styles.actions}>
        <Button label="Edit details" onPress={() => router.push({ pathname: '/garment/[id]/edit', params: { id: g.id } })} />
        <Button label={remove.isPending ? 'Deleting…' : 'Delete garment'} variant="secondary" disabled={remove.isPending} onPress={confirmDelete} />
      </View>
    </Screen>
  );
}

function detailRows(g: Garment): [string, string][] {
  const { color, pattern, material, occasions } = g.attributes;
  return [
    ['Colour', color ?? '—'],
    ['Pattern', pattern ?? '—'],
    ['Material', material ?? '—'],
    ['Good for', occasions && occasions.length > 0 ? occasions.map((o) => OCCASION_LABELS[o]).join(' · ') : '—'],
    ['Fit', g.fitNote ?? 'Fits as expected'],
  ];
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: radii.sm, backgroundColor: colors.sand },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  header: { gap: space.sm },
  section: { gap: 0 },
  detail: { flexDirection: 'row', gap: space.md, paddingVertical: space.md },
  detailLabel: { width: 96, paddingTop: 3 },
  detailValue: { flex: 1 },
  actions: { gap: space.sm },
});
