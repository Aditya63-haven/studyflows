import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { AuthController } from '../controllers/AuthController';
import { AvatarController } from '../controllers/AvatarController';
import { avatarUpload } from '../middleware/avatarUpload';
import { validate } from '../validation/validate';
import { loginSchema, registerSchema, updateProfileSchema } from '../validation/schemas';

export const createAuthRoutes = (container: AppContainer, auth: RequestHandler): Router => {
  const router = Router();
  const controller = new AuthController(container.authService);
  const avatarController = new AvatarController(container.avatarService);

  router.post('/register', validate({ body: registerSchema }), controller.register);
  router.post('/login', validate({ body: loginSchema }), controller.login);
  router.get('/me', auth, controller.me);
  router.patch('/me', auth, validate({ body: updateProfileSchema }), controller.updateMe);
  router.post('/me/avatar', auth, avatarUpload, avatarController.upload);
  router.delete('/me/avatar', auth, avatarController.remove);

  return router;
};
