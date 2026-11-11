import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { StudySpaceController } from '../controllers/StudySpaceController';
import { createSpaceNoteRoutes } from './noteRoutes';
import { createSpaceQuizRoutes } from './quizRoutes';
import { createSpaceFlashcardRoutes } from './flashcardRoutes';
import {
  createSpaceSchema,
  idParamSchema,
  updateSpaceSchema,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export const createSpaceRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new StudySpaceController(container.studySpaceService);

  router.use(auth);
  router.get('/', controller.list);
  router.post('/', validate({ body: createSpaceSchema }), controller.create);

  router.use('/:spaceId/notes', createSpaceNoteRoutes(container, auth));
  router.use('/:spaceId/quizzes', createSpaceQuizRoutes(container, auth));
  router.use('/:spaceId/decks', createSpaceFlashcardRoutes(container, auth));

  router.get('/:id', validate({ params: idParamSchema }), controller.get);
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: updateSpaceSchema }),
    controller.update,
  );
  router.delete('/:id', validate({ params: idParamSchema }), controller.delete);

  return router;
};
