import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import type { ApiErrorCode, ApiErrorResponse } from '@fashion-saavy/contracts';
import { UnsupportedImageError } from '../platform/images/process-photo';
import { ConflictError, InvalidRequestError, NotFoundError } from '../modules/wardrobe';

export function errorResponse(c: Context, status: ContentfulStatusCode, code: ApiErrorCode, message: string) {
  return c.json({ error: { code, message } } satisfies ApiErrorResponse, status);
}

const STATUS_CODES: Partial<Record<number, ApiErrorCode>> = {
  400: 'validation_failed',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
};

/** Maps every failure to the shared error envelope. Internal details are logged, never returned. */
export function handleError(error: Error, c: Context) {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    return errorResponse(c, 400, 'validation_failed', `${where}${issue?.message ?? 'Invalid request.'}`);
  }
  if (error instanceof NotFoundError) return errorResponse(c, 404, 'not_found', error.message);
  if (error instanceof InvalidRequestError) return errorResponse(c, 400, 'validation_failed', error.message);
  if (error instanceof ConflictError) return errorResponse(c, 409, 'conflict', error.message);
  if (error instanceof UnsupportedImageError) return errorResponse(c, 415, 'unsupported_media_type', error.message);
  if (error instanceof HTTPException) {
    const status = error.status as ContentfulStatusCode;
    return errorResponse(c, status, STATUS_CODES[status] ?? 'internal', error.message || 'Request failed.');
  }

  console.error(error);
  return errorResponse(c, 500, 'internal', 'Something went wrong on our side.');
}

/** Reads and validates a JSON body; malformed JSON is a validation failure, not a server error. */
export async function readJson<T>(c: Context, schema: { parse: (value: unknown) => T }): Promise<T> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: 'Request body must be valid JSON.' });
  }
  return schema.parse(body);
}
