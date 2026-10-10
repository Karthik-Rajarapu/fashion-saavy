import { ApiErrorResponseSchema, type ApiErrorCode } from '@fashion-saavy/contracts';
import { getApiBaseUrl, getDevUserId } from '../platform/config';

/** A failed API call. `message` is always safe to show to the user. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | 'network',
    message: string,
  ) {
    super(message);
  }
}

const NETWORK_MESSAGE = "Couldn't reach Fashion Saavy. Check your connection and try again.";

export async function send(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(0, 'network', NETWORK_MESSAGE);
  }
  if (!res.ok) throw await toApiError(res);
  return res;
}

/** Calls the versioned API and validates the response against the shared contract. */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, schema }: { method?: string; body?: unknown; schema?: { parse: (value: unknown) => T } } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const devUserId = getDevUserId();
  if (devUserId) headers['X-Dev-User-Id'] = devUserId;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await send(`${getApiBaseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!schema || res.status === 204) return undefined as T;
  return schema.parse(await res.json());
}

async function toApiError(res: Response): Promise<ApiError> {
  const parsed = ApiErrorResponseSchema.safeParse(await res.json().catch(() => null));
  if (parsed.success) return new ApiError(res.status, parsed.data.error.code, parsed.data.error.message);
  return new ApiError(res.status, 'internal', 'Something went wrong. Please try again.');
}

/** User-facing text for any error thrown by API calls. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
