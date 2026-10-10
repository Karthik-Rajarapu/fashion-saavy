import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Fashion Saavy' }} />
      <Stack.Screen name="status" options={{ title: 'API connection' }} />
    </Stack>
  );
}
