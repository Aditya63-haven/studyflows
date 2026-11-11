import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { RevisionController } from '../controllers/RevisionController';
import {
  idParamSchema,
  reviewScheduleSchema,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export const createRevisionRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new RevisionController(container.revisionService);

  router.use(auth);
  router.get('/', controller.list);
  router.get('/dashboard', controller.dashboard);
  router.post(
    '/:id/review',
    validate({ params: idParamSchema, body: reviewScheduleSchema }),
    controller.review,
  );

  return router;
};
