import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Fashion Saavy',
  slug: 'fashion-saavy',
  version: '0.0.0',
  scheme: 'fashionsaavy',
  // Native Android and iOS only; there is no web client (docs/ARCHITECTURE.md §14).
  platforms: ['android', 'ios'],
  // Placeholder identifiers for local development builds; confirm before any store setup.
  ios: { bundleIdentifier: 'com.fashionsaavy.app' },
  android: {
    package: 'com.fashionsaavy.app',
    // Garment capture takes photos only. expo-image-picker otherwise adds the microphone permission on Android.
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
  },
  plugins: [
    'expo-router',
    [
      'expo-image-picker',
      {
        // Shown by the OS the first time the user adds a garment photo; never requested up front.
        cameraPermission: 'Fashion Saavy uses the camera to photograph clothes you add to your wardrobe.',
        photosPermission: 'Fashion Saavy lets you choose photos of clothes to add to your wardrobe.',
        microphonePermission: false,
      },
    ],
  ],
  experiments: { typedRoutes: true },
};

export default config;
