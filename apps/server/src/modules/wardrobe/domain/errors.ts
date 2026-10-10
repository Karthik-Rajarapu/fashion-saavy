/** Domain failures. The HTTP layer maps them to the shared error envelope. */
export class NotFoundError extends Error {}
export class InvalidRequestError extends Error {}
export class ConflictError extends Error {}
