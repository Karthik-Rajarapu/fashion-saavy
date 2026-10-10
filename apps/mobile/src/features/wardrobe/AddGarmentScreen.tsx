import { useRouter } from 'expo-router';
import { errorMessage } from '../../api/client';
import { useCreateGarment } from '../../api/garments';
import { AppText } from '../../ui/AppText';
import { Screen } from '../../ui/Screen';
import { EMPTY_GARMENT_FORM, GarmentForm } from './GarmentForm';

export function AddGarmentScreen() {
  const router = useRouter();
  const create = useCreateGarment();

  return (
    <Screen topInset={false}>
      <AppText variant="title">One photo, then the details.</AppText>
      <AppText tone="muted">What you save here is what the Stylist will use. You can edit it any time.</AppText>
      <GarmentForm
        initialValues={EMPTY_GARMENT_FORM}
        requirePhoto
        submitLabel="Save to wardrobe"
        submitting={create.isPending}
        error={create.isError ? errorMessage(create.error) : null}
        onCancel={() => router.back()}
        onSubmit={({ photo, name, fitNote, ...rest }) => {
          if (!photo) return;
          create.mutate(
            { photo, draft: { ...rest, ...(name && { name }), ...(fitNote && { fitNote }) } },
            { onSuccess: () => router.dismissTo('/wardrobe') },
          );
        }}
      />
    </Screen>
  );
}
