import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { AttentionController } from '../controllers/AttentionController';
import { attentionApplySchema } from '../validation/schemas';
import { validate } from '../validation/validate';

export const createAttentionRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new AttentionController(container.attentionService);

  router.use(auth);
  router.get('/', controller.report);
  router.post(
    '/:id/apply',
    validate({ body: attentionApplySchema }),
    controller.apply,
  );

  return router;
};
