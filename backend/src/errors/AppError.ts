/**
 * Base class for every expected application error.
 *
 * OOP: Inheritance - all domain/API errors extend this class so the central
 * error middleware can treat them uniformly.
 * OOP: Encapsulation - exposes a stable read-only error contract.
 */
export class AppError extends Error {
  public override name: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
    details?: unknown,
  ) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);

    this.name = new.target.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
  }

  /**
   * Serializes the error without leaking stack traces.
   */
  public toJSON(): {
    name: string;
    message: string;
    statusCode: number;
    details?: unknown;
  } {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}
