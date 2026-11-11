import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AuthError } from '../errors';
import { AuthService } from '../services/AuthService';

/**
 * Creates Bearer-token authentication middleware from the auth service.
 */
export const createAuthMiddleware = (authService: AuthService): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.header('authorization');
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      next(new AuthError('Authentication required'));
      return;
    }

    const token = header.slice(7).trim();
    if (!token) {
      next(new AuthError('Authentication required'));
      return;
    }

    try {
      req.auth = authService.verifyToken(token);
      next();
    } catch (error) {
      next(error);
    }
  };
};
