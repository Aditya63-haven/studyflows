import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { QuizController } from '../controllers/QuizController';
import {
  createQuizSchema,
  idParamSchema,
  spaceIdParamSchema,
  submitQuizSchema,
  updateQuizSchema,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export const createSpaceQuizRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router({ mergeParams: true });
  const controller = new QuizController(container.quizService);

  router.use(auth);
  router.get(
    '/',
    validate({ params: spaceIdParamSchema }),
    controller.listBySpace,
  );
  router.post(
    '/',
    validate({ params: spaceIdParamSchema, body: createQuizSchema }),
    controller.create,
  );

  return router;
};

export const createQuizRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new QuizController(container.quizService);

  router.use(auth);
  router.get('/:id', validate({ params: idParamSchema }), controller.get);
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: updateQuizSchema }),
    controller.update,
  );
  router.delete('/:id', validate({ params: idParamSchema }), controller.delete);
  router.post(
    '/:id/attempts',
    validate({ params: idParamSchema, body: submitQuizSchema }),
    controller.take,
  );
  router.get(
    '/:id/attempts',
    validate({ params: idParamSchema }),
    controller.attempts,
  );

  return router;
};
