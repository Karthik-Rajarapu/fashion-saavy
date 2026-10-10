import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

/** Retry once for network and server failures; a 4xx (missing, invalid, unauthorized) won't change on retry. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // Photo URLs are signed for an hour; refetching keeps them fresh without caching them as identifiers.
        staleTime: 30_000,
      },
    },
  });
}
