import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { AuthController } from '../controllers/AuthController';
import { validate } from '../validation/validate';
import { loginSchema, registerSchema } from '../validation/schemas';

export const createAuthRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new AuthController(container.authService);

  router.post('/register', validate({ body: registerSchema }), controller.register);
  router.post('/login', validate({ body: loginSchema }), controller.login);
  router.get('/me', auth, controller.me);

  return router;
};
