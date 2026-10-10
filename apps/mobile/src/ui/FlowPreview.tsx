import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { Rule } from './Rule';
import { Screen } from './Screen';
import { space } from './tokens';

type Props = {
  kicker: string;
  title: string;
  intro: string;
  steps: readonly { title: string; detail: string }[];
  notes?: readonly string[];
  onClose: () => void;
};

/**
 * Explains a flow that is designed but not built yet, honestly and in the product's own voice.
 * Each preview is replaced by the real flow at the same route.
 */
export function FlowPreview({ kicker, title, intro, steps, notes = [], onClose }: Props) {
  return (
    <Screen topInset={false}>
      <View style={styles.intro}>
        <AppText variant="kicker" tone="accent">
          {kicker}
        </AppText>
        <AppText variant="title">{title}</AppText>
        <AppText tone="muted">{intro}</AppText>
      </View>

      <View style={styles.steps}>
        <Rule strong />
        {steps.map((step, i) => (
          <View key={step.title}>
            <View style={styles.step}>
              <AppText variant="heading" tone="accent" style={styles.number}>
                {String(i + 1).padStart(2, '0')}
              </AppText>
              <View style={styles.stepText}>
                <AppText variant="heading">{step.title}</AppText>
                <AppText variant="small" tone="muted">
                  {step.detail}
                </AppText>
              </View>
            </View>
            <Rule />
          </View>
        ))}
      </View>

      {notes.map((note) => (
        <AppText key={note} variant="small" tone="muted">
          {note}
        </AppText>
      ))}

      <View style={styles.status}>
        <AppText variant="label">Not available in this preview build yet.</AppText>
        <Button label="Close" variant="secondary" onPress={onClose} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.sm },
  steps: { gap: 0 },
  step: { flexDirection: 'row', gap: space.lg, paddingVertical: space.md },
  number: { width: 28 },
  stepText: { flex: 1, gap: 2 },
  status: { gap: space.md, paddingTop: space.sm },
});
