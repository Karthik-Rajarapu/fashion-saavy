import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Rule } from '../../ui/Rule';
import { SampleTag } from '../../ui/SampleTag';
import { Screen } from '../../ui/Screen';
import { colors, gutter, space } from '../../ui/tokens';
import { useWardrobeSummary } from '../wardrobe/wardrobe-state';
import { EXAMPLE_STYLE_PROFILE, useStyleProfile, type StyleProfileSummary } from './style-profile-state';

export function ProfileScreen() {
  const router = useRouter();
  const profile = useStyleProfile();
  const { garmentCount } = useWardrobeSummary();

  return (
    <Screen>
      <View style={styles.intro}>
        <AppText variant="kicker">Profile</AppText>
        <AppText variant="display">Your style</AppText>
      </View>

      {profile ? (
        <View style={styles.block}>
          <StyleSummary profile={profile} />
          <Button
            label="Retake the questionnaire"
            variant="secondary"
            accessibilityHint="Replaces your current Style Profile"
            onPress={() => router.push('/questionnaire')}
          />
        </View>
      ) : (
        <>
          <View style={styles.block}>
            <AppText variant="title">Your Style Profile isn't set yet.</AppText>
            <AppText tone="muted">
              A short, visual questionnaire turns your taste into a summary the Stylist works from. When your style
              changes, you retake it.
            </AppText>
            <Button label="Take the style questionnaire" onPress={() => router.push('/questionnaire')} />
          </View>

          <View style={[styles.example, styles.fullBleed]}>
            <SampleTag label="Example · not your profile" />
            <StyleSummary profile={EXAMPLE_STYLE_PROFILE} />
          </View>
        </>
      )}

      <View style={styles.block}>
        <AppText variant="kicker">At a glance</AppText>
        <Rule strong />
        <InfoRow
          title="Wardrobe"
          detail={garmentCount === 1 ? '1 piece' : `${garmentCount} pieces`}
          action={<Button label="Open wardrobe" variant="link" onPress={() => router.navigate('/wardrobe')} />}
        />
        <InfoRow
          title="Saved outfits"
          detail="None yet. Saved outfits stay for 30 days, and you can extend them up to 45."
        />
        <InfoRow
          title="Account"
          detail="No account yet. Sign-in comes in a later build; nothing in this preview is saved."
        />
      </View>

      {__DEV__ && (
        <View style={styles.block}>
          <AppText variant="kicker" tone="muted">
            Developer
          </AppText>
          <Button label="API connection check" variant="link" onPress={() => router.push('/dev/api-status')} />
        </View>
      )}
    </Screen>
  );
}

function StyleSummary({ profile }: { profile: StyleProfileSummary }) {
  return (
    <View style={styles.summary}>
      <AppText variant="title">{profile.direction}</AppText>
      <AppText>{profile.summary}</AppText>
      <View>
        {profile.preferences.map((pref) => (
          <View key={pref.label} style={styles.pref}>
            <AppText variant="kicker" tone="muted" style={styles.prefLabel}>
              {pref.label}
            </AppText>
            <AppText variant="small" style={styles.prefValue}>
              {pref.value}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="small" tone="muted">
        Dresses for: {profile.dressesFor.join(' · ')}
      </AppText>
    </View>
  );
}

function InfoRow({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <View>
      <View style={styles.infoRow}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="small" tone="muted">
          {detail}
        </AppText>
        {action}
      </View>
      <Rule />
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.sm },
  block: { gap: space.md },
  fullBleed: { marginHorizontal: -gutter },
  example: { backgroundColor: colors.sand, paddingHorizontal: gutter, paddingVertical: space.xxl, gap: space.lg },
  summary: { gap: space.md },
  pref: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.inkMuted,
  },
  prefLabel: { width: 104, paddingTop: 2 },
  prefValue: { flex: 1 },
  infoRow: { paddingVertical: space.md, gap: 2 },
});
