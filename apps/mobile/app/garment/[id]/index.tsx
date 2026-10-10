import { useLocalSearchParams } from 'expo-router';
import { GarmentDetailScreen } from '../../../src/features/wardrobe/GarmentDetailScreen';

export default function GarmentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GarmentDetailScreen id={id} />;
}
