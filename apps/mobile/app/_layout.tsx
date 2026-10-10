import { StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { colors, fonts } from '../src/ui/tokens';

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.sans, fontWeight: '600' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.paper },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="story/[id]" options={{ title: '' }} />
        <Stack.Screen name="add-garment" options={{ presentation: 'modal', title: 'Add a garment' }} />
        <Stack.Screen name="questionnaire" options={{ presentation: 'modal', title: 'Style questionnaire' }} />
        <Stack.Screen name="dev/api-status" options={{ title: 'API connection' }} />
      </Stack>
    </>
  );
}
