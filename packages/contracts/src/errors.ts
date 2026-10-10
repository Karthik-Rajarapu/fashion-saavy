import { z } from 'zod';

export const API_ERROR_CODES = [
  'validation_failed',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'payload_too_large',
  'unsupported_media_type',
  'internal',
] as const;

/** Every non-2xx API response uses this envelope. `message` is safe to show; raw internals never are. */
export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
  }),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
