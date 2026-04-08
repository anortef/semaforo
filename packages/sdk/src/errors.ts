export class SemaforoError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = "SemaforoError";
  }
}

export class UnauthorizedError extends SemaforoError {
  constructor(message = "Invalid or missing API key") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends SemaforoError {
  constructor(message = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends SemaforoError {
  public readonly retryAfterMs?: number;

  constructor(message = "Rate limit exceeded", retryAfterMs?: number) {
    super(message, 429);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class ServerError extends SemaforoError {
  constructor(message = "Internal server error") {
    super(message, 500);
    this.name = "ServerError";
  }
}
