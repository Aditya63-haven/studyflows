import { Router } from 'express';
import { AppContainer } from '../container';
import { AvatarController } from '../controllers/AvatarController';

export const createAvatarRoutes = (container: AppContainer): Router => {
  const router = Router();
  const controller = new AvatarController(container.avatarService);

  router.get('/:key', controller.get);

  return router;
};
