import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Rule } from '../../ui/Rule';
import { SampleTag } from '../../ui/SampleTag';
import { Screen } from '../../ui/Screen';
import { SwatchStrip } from '../../ui/SwatchStrip';
import { colors, gutter, space } from '../../ui/tokens';
import { SAMPLE_STORIES, type Story } from '../inspiration/sample-stories';
import { useWardrobeSummary } from '../wardrobe/wardrobe-state';
import { formatMastheadDate, greetingFor } from './greeting';

// The Pressable's label replaces its children for screen readers, so it must carry the sample marker itself.
const storyLabel = (story: Story) => `Sample story: ${story.title}. ${story.dek}`;

export function HomeScreen() {
  const router = useRouter();
  const { garmentCount } = useWardrobeSummary();
  const now = new Date();
  const [lead, ...notes] = SAMPLE_STORIES;
  const openStory = (story: Story) => router.push({ pathname: '/story/[id]', params: { id: story.id } });

  return (
    <Screen>
      <View style={styles.masthead}>
        <AppText variant="kicker">Fashion Saavy</AppText>
        <AppText variant="small" tone="muted">
          {formatMastheadDate(now)}
        </AppText>
      </View>
      <Rule strong />

      <View style={styles.greeting}>
        <AppText variant="display">{greetingFor(now)}.</AppText>
        <AppText tone="muted">Today's edit: ideas worth borrowing, and how to wear them with what you own.</AppText>
      </View>

      {lead && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={storyLabel(lead)}
          accessibilityHint="Opens the story"
          onPress={() => openStory(lead)}
          style={({ pressed }) => [styles.lead, pressed && styles.pressed]}>
          <SwatchStrip palette={lead.palette} height={200} style={styles.fullBleed} />
          <View style={styles.leadText}>
            <View style={styles.row}>
              <AppText variant="kicker" tone="accent">
                {lead.kicker}
              </AppText>
              <SampleTag />
            </View>
            <AppText variant="title">{lead.title}</AppText>
            <AppText tone="muted">{lead.dek}</AppText>
            <AppText variant="label" style={styles.underline}>
              Read the story
            </AppText>
          </View>
        </Pressable>
      )}

      <View style={[styles.wardrobeBand, styles.fullBleed]}>
        <AppText variant="kicker">Dress from what you own</AppText>
        {garmentCount === 0 ? (
          <>
            <AppText variant="title">Your wardrobe starts here.</AppText>
            <AppText>
              Add three to five pieces you wear most. The Stylist builds outfits only from clothes you own, so this is
              the step that makes everything personal.
            </AppText>
            <View style={styles.actions}>
              <Button label="Add your first garment" onPress={() => router.push('/add-garment')} />
              <Button label="See how the Stylist works" variant="link" onPress={() => router.push('/stylist')} />
            </View>
          </>
        ) : (
          <>
            <AppText variant="title">What are we wearing today?</AppText>
            <View style={styles.actions}>
              <Button label="Create an outfit" onPress={() => router.push('/stylist')} />
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <AppText variant="kicker">Style notes</AppText>
          <SampleTag />
        </View>
        <Rule strong />
        {notes.map((story, i) => (
          <View key={story.id}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={storyLabel(story)}
              accessibilityHint="Opens the story"
              onPress={() => openStory(story)}
              style={({ pressed }) => [styles.note, pressed && styles.pressed]}>
              <AppText variant="title" tone="muted" style={styles.noteNumber}>
                {String(i + 2).padStart(2, '0')}
              </AppText>
              <View style={styles.noteText}>
                <AppText variant="kicker" tone="accent">
                  {story.kicker}
                </AppText>
                <AppText variant="heading">{story.title}</AppText>
                <AppText variant="small" tone="muted">
                  {story.dek}
                </AppText>
                <SwatchStrip palette={story.palette} height={6} style={styles.noteSwatch} />
              </View>
            </Pressable>
            <Rule />
          </View>
        ))}
      </View>

      <AppText variant="small" tone="muted">
        Stories in this preview are written by the Fashion Saavy team to show how inspiration will work. They are not
        yet personalized to you.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  masthead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  greeting: { gap: space.sm },
  lead: { gap: space.lg },
  leadText: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  underline: { textDecorationLine: 'underline' },
  fullBleed: { marginHorizontal: -gutter },
  wardrobeBand: {
    backgroundColor: colors.sand,
    paddingHorizontal: gutter,
    paddingVertical: space.xxl,
    gap: space.md,
  },
  actions: { gap: space.sm, marginTop: space.sm },
  section: { gap: space.md },
  note: { flexDirection: 'row', gap: space.lg, paddingVertical: space.lg },
  noteNumber: { width: 44 },
  noteText: { flex: 1, gap: space.xs },
  noteSwatch: { width: 96, marginTop: space.sm },
  pressed: { opacity: 0.7 },
});
