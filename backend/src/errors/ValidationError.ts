import { AppError } from './AppError';

/**
 * Raised when request input or domain data fails validation.
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 400, true, details);
  }
}
