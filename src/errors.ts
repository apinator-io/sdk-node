/**
 * Base error class for all Realtime SDK errors.
 */
export class RealtimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RealtimeError";
    Object.setPrototypeOf(this, RealtimeError.prototype);
  }
}

/**
 * Error thrown when authentication fails (401 responses).
 */
export class AuthenticationError extends RealtimeError {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error thrown when request validation fails (400 responses).
 */
export class ValidationError extends RealtimeError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Generic API error with status code and response body.
 */
export class ApiError extends RealtimeError {
  public readonly status: number;
  public readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
