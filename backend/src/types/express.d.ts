import { AuthTokenPayload } from '../services/AuthService';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export {};
