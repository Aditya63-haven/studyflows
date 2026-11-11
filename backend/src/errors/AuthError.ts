import { AppError } from './AppError';

/**
 * Raised when authentication is missing or invalid.
 */
export class AuthError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(message, 401, true, details);
  }
}
