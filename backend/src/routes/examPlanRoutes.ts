import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { ExamPlanController } from '../controllers/ExamPlanController';
import {
  createExamPlanSchema,
  idParamSchema,
  markTopicCompleteSchema,
  planTopicParamsSchema,
  updateExamPlanSchema,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export const createExamPlanRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new ExamPlanController(container.examPlanService);

  router.use(auth);
  router.get('/', controller.list);
  router.post('/', validate({ body: createExamPlanSchema }), controller.create);
  router.get('/:id', validate({ params: idParamSchema }), controller.get);
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: updateExamPlanSchema }),
    controller.update,
  );
  router.delete('/:id', validate({ params: idParamSchema }), controller.delete);
  router.post(
    '/:id/topics/:topicId/complete',
    validate({ params: planTopicParamsSchema, body: markTopicCompleteSchema }),
    controller.markTopicComplete,
  );

  return router;
};
