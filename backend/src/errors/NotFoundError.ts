import { AppError } from './AppError';

/**
 * Raised when a requested resource does not exist.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, 404, true, details);
  }
}
