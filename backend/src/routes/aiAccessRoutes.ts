import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { AiAccessController } from '../controllers/AiAccessController';
import { aiAccessGrantSchema, idParamSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

export const createAiAccessRoutes = (container: AppContainer, auth: RequestHandler): Router => {
  const router = Router();
  const controller = new AiAccessController(container.aiAccessService);

  router.use(auth);
  router.get('/status', controller.status);
  router.get('/grants', controller.list);
  router.post('/grants', validate({ body: aiAccessGrantSchema }), controller.grant);
  router.delete('/grants/:id', validate({ params: idParamSchema }), controller.revoke);

  return router;
};
