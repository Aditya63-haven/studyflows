import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { NotificationController } from '../controllers/NotificationController';
import { idParamSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

export const createNotificationRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new NotificationController(
    container.notificationService,
    container.attentionService,
  );

  router.use(auth);
  router.get('/', controller.list);
  router.patch(
    '/:id/read',
    validate({ params: idParamSchema }),
    controller.markRead,
  );

  return router;
};
