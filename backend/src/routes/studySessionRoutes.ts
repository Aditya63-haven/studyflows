import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { StudySessionController } from '../controllers/StudySessionController';
import { createSessionSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

export const createSessionRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new StudySessionController(container.studySessionService);

  router.use(auth);
  router.get('/', controller.list);
  router.post('/', validate({ body: createSessionSchema }), controller.create);

  return router;
};
