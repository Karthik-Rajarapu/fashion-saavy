import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Rule } from '../../ui/Rule';
import { Screen } from '../../ui/Screen';
import { colors, fonts, minTouch, space } from '../../ui/tokens';
import { useStyleProfile } from '../profile/style-profile-state';
import { pieceCount, useWardrobeSummary } from '../wardrobe/wardrobe-state';

const OCCASIONS = ['College', 'Everyday', 'Weekend', 'Festive', 'Date night', 'Interview'] as const;

export function StylistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ request?: string; handoff?: string }>();
  const { garmentCount, isError: wardrobeError } = useWardrobeSummary();
  const profile = useStyleProfile();
  const [request, setRequest] = useState(params.request ?? '');
  const [occasion, setOccasion] = useState<string | null>(null);

  // The tab stays mounted, so a request handed over from a story replaces the current text. Each handoff carries
  // a fresh `handoff` id, so handing over the same idea again (after the user edited the text) still applies it.
  useEffect(() => {
    if (params.request) setRequest(params.request);
  }, [params.request, params.handoff]);

  const ingredients = [
    {
      title: 'Your wardrobe',
      status:
        garmentCount === null
          ? wardrobeError
            ? "Couldn't check your wardrobe right now."
            : 'Checking your wardrobe…'
          : garmentCount === 0
            ? 'Empty. Add a few pieces to begin.'
            : `${pieceCount(garmentCount)} to choose from`,
    },
    {
      title: 'Your Style Profile',
      status: profile ? profile.direction : 'Not set yet. The style questionnaire sets it.',
    },
    { title: 'The occasion', status: occasion ?? 'Optional. Pick one above, or just describe it.' },
  ];

  return (
    <Screen>
      <View style={styles.intro}>
        <AppText variant="kicker">Stylist</AppText>
        <AppText variant="display">What are we dressing for?</AppText>
      </View>

      <View style={styles.field}>
        <AppText variant="label">
          Describe it in your own words
        </AppText>
        <TextInput
          accessibilityLabel="Describe what you need an outfit for"
          value={request}
          onChangeText={setRequest}
          placeholder="Something casual for college, it's hot out"
          placeholderTextColor={colors.inkMuted}
          returnKeyType="done"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <AppText variant="label">Occasion (optional)</AppText>
        <View style={styles.chips}>
          {OCCASIONS.map((name) => (
            <Chip
              key={name}
              label={name}
              selected={occasion === name}
              onPress={() => setOccasion(occasion === name ? null : name)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="kicker">How your outfit is made</AppText>
        <Rule strong />
        {ingredients.map((item, i) => (
          <View key={item.title}>
            <View style={styles.ingredient}>
              <AppText variant="heading" tone="accent" style={styles.number}>
                {String(i + 1).padStart(2, '0')}
              </AppText>
              <View style={styles.ingredientText}>
                <AppText variant="heading">{item.title}</AppText>
                <AppText variant="small" tone="muted">
                  {item.status}
                </AppText>
              </View>
            </View>
            <Rule />
          </View>
        ))}
      </View>

      {garmentCount === 0 ? (
        <View style={styles.callout}>
          <AppText>
            Outfits are built only from clothes you own, so the Stylist needs a few pieces first.
          </AppText>
          <Button label="Add garments to start" onPress={() => router.push('/add-garment')} />
          {!profile && (
            <Button label="Take the style questionnaire" variant="link" onPress={() => router.push('/questionnaire')} />
          )}
        </View>
      ) : garmentCount !== null ? (
        <AppText tone="muted">Outfit creation arrives in the next build.</AppText>
      ) : null}

      <AppText variant="small" tone="muted">
        Every outfit will come with a short note on why it works. You'll be able to swap single pieces, save it, tell
        us how it landed, and later try it on with your camera.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.sm },
  field: { gap: space.sm },
  input: {
    minHeight: minTouch,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 17,
    color: colors.ink,
    paddingVertical: space.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  section: { gap: space.md },
  ingredient: { flexDirection: 'row', gap: space.lg, paddingVertical: space.md },
  number: { width: 28 },
  ingredientText: { flex: 1, gap: 2 },
  callout: { gap: space.md, paddingTop: space.sm },
});
