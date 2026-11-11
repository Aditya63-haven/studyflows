import { AppError } from './AppError';

/**
 * Raised when an authenticated user is not allowed to perform an action.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', details?: unknown) {
    super(message, 403, true, details);
  }
}
