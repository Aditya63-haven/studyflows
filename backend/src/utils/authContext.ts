import { Request } from 'express';
import { AuthTokenPayload } from '../services/AuthService';
import { AuthError } from '../errors';

/**
 * Reads the authenticated principal placed on the request by auth middleware.
 */
export const authContext = (req: Request): AuthTokenPayload => {
  if (!req.auth) {
    throw new AuthError('Authentication required');
  }
  return req.auth;
};
