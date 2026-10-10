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

/**
 * Development-only identity, sent as `X-Dev-User-Id` until real sign-in exists.
 * It is public (bundled) and grants nothing unless the API runs with DEV_AUTH=true, which it refuses in production.
 */
export function getDevUserId(): string | undefined {
  return process.env.EXPO_PUBLIC_DEV_USER_ID || undefined;
}
