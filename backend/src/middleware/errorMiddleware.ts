import { ErrorRequestHandler } from 'express';
import { AppError } from '../errors';

/**
 * Central error handler. Every route error is converted into a consistent
 * `{ error: { name, message, details? } }` response.
 */
export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  const isKnownError = err instanceof AppError;
  const statusCode = isKnownError ? err.statusCode : 500;
  const name = isKnownError ? err.name : 'InternalServerError';

  const fallbackMessage =
    err instanceof Error ? err.message : 'An unexpected error occurred';
  const message =
    isKnownError || process.env.NODE_ENV !== 'production'
      ? fallbackMessage
      : 'Internal server error';

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(statusCode).json({
    error: {
      name,
      message,
      ...(isKnownError && err.details !== undefined ? { details: err.details } : {}),
    },
  });
};
