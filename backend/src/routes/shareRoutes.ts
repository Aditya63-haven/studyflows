import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { SharingController } from '../controllers/SharingController';
import {
  shareNoteParamsSchema,
  shareQuizParamsSchema,
  submitQuizSchema,
  tokenParamsSchema,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export const createShareRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new SharingController(container.sharingService);

  router.use(auth);
  router.post(
    '/notes/:id',
    validate({ params: shareNoteParamsSchema }),
    controller.shareNote,
  );
  router.post(
    '/quizzes/:id',
    validate({ params: shareQuizParamsSchema }),
    controller.shareQuiz,
  );
  router.delete(
    '/:token',
    validate({ params: tokenParamsSchema }),
    controller.revoke,
  );

  return router;
};

export const createPublicRoutes = (container: AppContainer): Router => {
  const router = Router();
  const controller = new SharingController(container.sharingService);

  router.get(
    '/notes/:token',
    validate({ params: tokenParamsSchema }),
    controller.publicNote,
  );
  router.get(
    '/quizzes/:token',
    validate({ params: tokenParamsSchema }),
    controller.publicQuiz,
  );
  router.post(
    '/quizzes/:token/attempts',
    validate({ params: tokenParamsSchema, body: submitQuizSchema }),
    controller.attemptPublicQuiz,
  );

  return router;
};
