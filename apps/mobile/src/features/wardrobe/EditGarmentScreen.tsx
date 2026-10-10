import { ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import type { Garment } from '@fashion-saavy/contracts';
import { errorMessage } from '../../api/client';
import { useGarment, useUpdateGarment } from '../../api/garments';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { colors } from '../../ui/tokens';
import { GarmentForm, type GarmentFormValues } from './GarmentForm';

function toFormValues(g: Garment): GarmentFormValues {
  return {
    category: g.category,
    name: g.name ?? '',
    color: g.attributes.color ?? '',
    pattern: g.attributes.pattern ?? '',
    material: g.attributes.material ?? '',
    occasions: g.attributes.occasions ?? [],
    fitNote: g.fitNote ?? '',
  };
}

export function EditGarmentScreen({ id }: { id: string }) {
  const router = useRouter();
  const garment = useGarment(id);
  const update = useUpdateGarment(id);

  if (garment.isPending) {
    return (
      <Screen topInset={false}>
        <ActivityIndicator color={colors.ink} accessibilityLabel="Loading garment" />
      </Screen>
    );
  }
  if (garment.isError) {
    return (
      <Screen topInset={false}>
        <AppText variant="title">Couldn't load this garment.</AppText>
        <AppText tone="muted">{errorMessage(garment.error)}</AppText>
        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen topInset={false}>
      <GarmentForm
        initialValues={toFormValues(garment.data)}
        existingPhotoUrl={garment.data.image?.displayUrl ?? null}
        requirePhoto={false}
        submitLabel="Save changes"
        submitting={update.isPending}
        error={update.isError ? errorMessage(update.error) : null}
        onCancel={() => router.back()}
        // Attributes replace the whole set, and cleared fields are sent as null so they are really removed.
        onSubmit={({ photo, ...fields }) => update.mutate({ patch: fields, photo }, { onSuccess: () => router.back() })}
      />
    </Screen>
  );
}
