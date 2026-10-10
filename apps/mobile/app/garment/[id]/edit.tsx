import { useLocalSearchParams } from 'expo-router';
import { EditGarmentScreen } from '../../../src/features/wardrobe/EditGarmentScreen';

export default function EditGarmentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditGarmentScreen id={id} />;
}
