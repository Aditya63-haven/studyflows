import { AppError } from './AppError';

/**
 * Raised when an uploaded payload exceeds the configured limit.
 */
export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload too large', details?: unknown) {
    super(message, 413, true, details);
  }
}
