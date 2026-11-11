import { AppError } from './AppError';

/**
 * Raised when a resource already exists or an operation conflicts with current state.
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, 409, true, details);
  }
}
