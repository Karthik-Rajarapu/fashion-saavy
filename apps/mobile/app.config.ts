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
  android: { package: 'com.fashionsaavy.app' },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
};

export default config;
