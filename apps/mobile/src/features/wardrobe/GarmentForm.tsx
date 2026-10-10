import { useState } from 'react';
import { Image, Linking, StyleSheet, TextInput, View } from 'react-native';
import {
  GARMENT_CATEGORIES,
  GARMENT_OCCASIONS,
  type GarmentAttributes,
  type GarmentCategory,
  type GarmentOccasion,
} from '@fashion-saavy/contracts';
import { pickPhoto, type PickedPhoto } from '../../platform/photos';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Chip } from '../../ui/Chip';
import { Rule } from '../../ui/Rule';
import { colors, fonts, minTouch, radii, space } from '../../ui/tokens';
import { CATEGORY_LABELS, OCCASION_LABELS } from './wardrobe-state';

/** What the user is editing. Text fields stay raw strings until submit. */
export type GarmentFormValues = {
  category: GarmentCategory | null;
  name: string;
  color: string;
  pattern: string;
  material: string;
  occasions: GarmentOccasion[];
  fitNote: string;
};

export const EMPTY_GARMENT_FORM: GarmentFormValues = {
  category: null,
  name: '',
  color: '',
  pattern: '',
  material: '',
  occasions: [],
  fitNote: '',
};

/** The validated result handed to the screen; blank text fields become absent. */
export type GarmentFormResult = {
  category: GarmentCategory;
  name: string | null;
  attributes: GarmentAttributes;
  fitNote: string | null;
  photo: PickedPhoto | null;
};

type Props = {
  initialValues: GarmentFormValues;
  /** An already-saved photo (edit mode). */
  existingPhotoUrl?: string | null;
  /** New garments need a photo; edits may keep the existing one. */
  requirePhoto: boolean;
  submitLabel: string;
  submitting: boolean;
  /** A save failure to show (already user-safe). */
  error: string | null;
  onSubmit: (result: GarmentFormResult) => void;
  onCancel: () => void;
};

const blankToNull = (value: string): string | null => (value.trim() === '' ? null : value.trim());

export function GarmentForm({
  initialValues,
  existingPhotoUrl = null,
  requirePhoto,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [values, setValues] = useState(initialValues);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [photoProblem, setPhotoProblem] = useState<'denied' | 'failed' | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const set = <K extends keyof GarmentFormValues>(key: K, value: GarmentFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const shownPhotoUri = photo?.uri ?? existingPhotoUrl;
  const missingPhoto = requirePhoto && photo === null;
  const missingCategory = values.category === null;

  async function choose(source: 'camera' | 'library') {
    setPhotoProblem(null);
    try {
      const result = await pickPhoto(source);
      if (result.kind === 'picked') setPhoto(result.photo);
      if (result.kind === 'denied') setPhotoProblem('denied');
    } catch {
      setPhotoProblem('failed');
    }
  }

  function submit() {
    if (missingPhoto || values.category === null) {
      setShowErrors(true);
      return;
    }
    const attributes: GarmentAttributes = {};
    const color = blankToNull(values.color);
    const pattern = blankToNull(values.pattern);
    const material = blankToNull(values.material);
    if (color) attributes.color = color;
    if (pattern) attributes.pattern = pattern;
    if (material) attributes.material = material;
    if (values.occasions.length > 0) attributes.occasions = values.occasions;
    onSubmit({
      category: values.category,
      name: blankToNull(values.name),
      attributes,
      fitNote: blankToNull(values.fitNote),
      photo,
    });
  }

  return (
    <View style={styles.form}>
      <View style={styles.section}>
        <AppText variant="kicker">Photo</AppText>
        {shownPhotoUri ? (
          <Image
            source={{ uri: shownPhotoUri }}
            style={styles.photo}
            resizeMode="cover"
            accessibilityLabel="Garment photo"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <AppText variant="small" tone="muted">
              One piece, laid flat or hanging, in daylight on a plain background.
            </AppText>
          </View>
        )}
        <View style={styles.row}>
          <Button
            label={shownPhotoUri ? 'Retake' : 'Take a photo'}
            variant="secondary"
            disabled={submitting}
            onPress={() => choose('camera')}
          />
          <Button
            label={shownPhotoUri ? 'Choose another' : 'Choose from library'}
            variant="secondary"
            disabled={submitting}
            onPress={() => choose('library')}
          />
        </View>
        {photoProblem === 'denied' && (
          <View style={styles.notice}>
            <AppText variant="small">
              Camera access is off. Turn it on in Settings, or choose a photo from your library instead.
            </AppText>
            <Button label="Open settings" variant="link" onPress={() => void Linking.openSettings()} />
          </View>
        )}
        {photoProblem === 'failed' && (
          <AppText variant="small">That photo couldn't be opened. Try another one.</AppText>
        )}
        {showErrors && missingPhoto && (
          <AppText variant="small" tone="accent">
            Add a photo of the garment.
          </AppText>
        )}
      </View>

      <View style={styles.section}>
        <AppText variant="kicker">Category</AppText>
        <View style={styles.chips}>
          {GARMENT_CATEGORIES.map((category) => (
            <Chip
              key={category}
              label={CATEGORY_LABELS[category].singular}
              selected={values.category === category}
              onPress={() => set('category', category)}
            />
          ))}
        </View>
        <AppText variant="small" tone="muted">
          Clothing only for now. Shoes are coming later.
        </AppText>
        {showErrors && missingCategory && (
          <AppText variant="small" tone="accent">
            Choose a category.
          </AppText>
        )}
      </View>

      <View style={styles.section}>
        <AppText variant="kicker">Details (optional)</AppText>
        <Rule strong />
        <Field label="Name" value={values.name} onChange={(v) => set('name', v)} placeholder="e.g. White linen shirt" max={80} />
        <Field label="Colour" value={values.color} onChange={(v) => set('color', v)} placeholder="e.g. Indigo" max={40} />
        <Field label="Pattern" value={values.pattern} onChange={(v) => set('pattern', v)} placeholder="e.g. Checked" max={40} />
        <Field label="Material" value={values.material} onChange={(v) => set('material', v)} placeholder="e.g. Cotton" max={40} />
      </View>

      <View style={styles.section}>
        <AppText variant="label">Good for</AppText>
        <View style={styles.chips}>
          {GARMENT_OCCASIONS.map((occasion) => {
            const selected = values.occasions.includes(occasion);
            return (
              <Chip
                key={occasion}
                label={OCCASION_LABELS[occasion]}
                selected={selected}
                onPress={() =>
                  set('occasions', selected ? values.occasions.filter((o) => o !== occasion) : [...values.occasions, occasion])
                }
              />
            );
          })}
        </View>
      </View>

      <Field
        label="Fit note"
        hint="Leave empty if it fits as expected."
        value={values.fitNote}
        onChange={(v) => set('fitNote', v)}
        placeholder="e.g. Slightly loose at the shoulders"
        max={200}
      />

      {error && (
        <AppText tone="accent" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
      <View style={styles.actions}>
        <Button label={submitting ? 'Saving…' : submitLabel} disabled={submitting} onPress={submit} />
        <Button label="Cancel" variant="secondary" disabled={submitting} onPress={onCancel} />
      </View>
    </View>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  max,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  max: number;
}) {
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      {hint && (
        <AppText variant="small" tone="muted">
          {hint}
        </AppText>
      )}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        maxLength={max}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.xl },
  section: { gap: space.md },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: radii.sm, backgroundColor: colors.sand },
  photoPlaceholder: {
    aspectRatio: 3 / 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.inkMuted,
    borderRadius: radii.sm,
    justifyContent: 'flex-end',
    padding: space.lg,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  notice: { gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  field: { gap: space.xs },
  input: {
    minHeight: minTouch,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 17,
    color: colors.ink,
    paddingVertical: space.sm,
  },
  actions: { gap: space.sm },
});
