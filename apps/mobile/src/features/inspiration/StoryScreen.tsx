import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Rule } from '../../ui/Rule';
import { SampleTag } from '../../ui/SampleTag';
import { Screen } from '../../ui/Screen';
import { SwatchStrip } from '../../ui/SwatchStrip';
import { gutter, space } from '../../ui/tokens';
import { findStory } from './sample-stories';

// Gives every Stylist handoff a distinct id (see StylistScreen).
let handoffCount = 0;

export function StoryScreen({ id }: { id: string | undefined }) {
  const router = useRouter();
  const story = findStory(id);

  if (!story) {
    return (
      <Screen topInset={false}>
        <AppText variant="title">This story isn't available.</AppText>
        <Button label="Back to Home" variant="secondary" onPress={() => router.navigate('/')} />
      </Screen>
    );
  }

  return (
    <Screen topInset={false}>
      <SwatchStrip palette={story.palette} height={220} style={styles.fullBleed} />
      <View style={styles.header}>
        <View style={styles.row}>
          <AppText variant="kicker" tone="accent">
            {story.kicker}
          </AppText>
          <SampleTag />
        </View>
        <AppText variant="display">{story.title}</AppText>
        <AppText tone="muted">{story.dek}</AppText>
      </View>

      <View style={styles.block}>
        <AppText variant="kicker">Why it works</AppText>
        <Rule strong />
        <AppText>{story.whyItWorks}</AppText>
      </View>

      <View style={styles.block}>
        <AppText variant="kicker">Borrow the principle</AppText>
        <Rule strong />
        {story.principles.map((principle, i) => (
          <View key={principle}>
            <View style={styles.principle}>
              <AppText variant="heading" tone="accent" style={styles.number}>
                {String(i + 1).padStart(2, '0')}
              </AppText>
              <AppText style={styles.principleText}>{principle}</AppText>
            </View>
            <Rule />
          </View>
        ))}
      </View>

      <Button
        label="Try this idea with my wardrobe"
        // dismissTo returns to the existing tabs instead of stacking a second tab navigator on top of the story.
        onPress={() =>
          router.dismissTo({
            pathname: '/stylist',
            params: { request: story.tryWithWardrobe, handoff: String(++handoffCount) },
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fullBleed: { marginHorizontal: -gutter, marginTop: -space.lg },
  header: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  block: { gap: space.md },
  principle: { flexDirection: 'row', gap: space.lg, paddingVertical: space.md },
  number: { width: 28 },
  principleText: { flex: 1 },
});
