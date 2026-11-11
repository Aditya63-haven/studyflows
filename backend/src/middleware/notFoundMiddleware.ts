import { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../errors';

/**
 * Converts unmatched routes into a typed 404 error.
 */
export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};
