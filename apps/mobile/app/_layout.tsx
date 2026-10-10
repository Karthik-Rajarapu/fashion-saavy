import { useState } from 'react';
import { StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../src/api/query-client';
import { colors, fonts } from '../src/ui/tokens';

export default function RootLayout() {
  // One cache per app launch. It is only a cache: garments persist on the server, not in memory.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
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
        <Stack.Screen name="garment/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="garment/[id]/edit" options={{ presentation: 'modal', title: 'Edit garment' }} />
        <Stack.Screen name="questionnaire" options={{ presentation: 'modal', title: 'Style questionnaire' }} />
        <Stack.Screen name="dev/api-status" options={{ title: 'API connection' }} />
      </Stack>
    </QueryClientProvider>
  );
}
