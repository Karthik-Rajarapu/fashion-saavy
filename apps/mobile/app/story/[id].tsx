import { useLocalSearchParams } from 'expo-router';
import { StoryScreen } from '../../src/features/inspiration/StoryScreen';

export default function StoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StoryScreen id={id} />;
}
