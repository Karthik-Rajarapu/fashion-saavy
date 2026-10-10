/**
 * Base URL of the API, without a trailing slash.
 * Expo inlines EXPO_PUBLIC_* at bundle time, so this must be read as a literal `process.env.X` access.
 */
export function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url || !/^https?:\/\/\S+$/.test(url)) {
    throw new Error('EXPO_PUBLIC_API_URL is missing or invalid. Copy apps/mobile/.env.example to apps/mobile/.env.');
  }
  return url.replace(/\/+$/, '');
}
