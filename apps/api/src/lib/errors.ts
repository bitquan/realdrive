export class DomainError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 401 | 403 | 404 | 409 | 422,
    readonly code: string
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function badRequestError(message: string, code = "bad_request") {
  return new DomainError(message, 400, code);
}

export function unauthorizedError(message: string, code = "unauthorized") {
  return new DomainError(message, 401, code);
}

export function forbiddenError(message: string, code = "forbidden") {
  return new DomainError(message, 403, code);
}

export function notFoundError(message: string, code = "not_found") {
  return new DomainError(message, 404, code);
}

export function conflictError(message: string, code = "conflict") {
  return new DomainError(message, 409, code);
}

export function unprocessableEntityError(message: string, code = "unprocessable_entity") {
  return new DomainError(message, 422, code);
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
