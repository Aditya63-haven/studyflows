import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { NoteController } from '../controllers/NoteController';
import { QuizController } from '../controllers/QuizController';
import {
  createNoteSchema,
  idParamSchema,
  spaceIdParamSchema,
  updateNoteSchema,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export const createSpaceNoteRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router({ mergeParams: true });
  const controller = new NoteController(container.noteService);

  router.use(auth);
  router.get(
    '/',
    validate({ params: spaceIdParamSchema }),
    controller.listBySpace,
  );
  router.post(
    '/',
    validate({ params: spaceIdParamSchema, body: createNoteSchema }),
    controller.create,
  );

  return router;
};

export const createNoteRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new NoteController(container.noteService);
  const quizController = new QuizController(container.quizService);

  router.use(auth);
  router.get('/:id', validate({ params: idParamSchema }), controller.get);
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: updateNoteSchema }),
    controller.update,
  );
  router.delete('/:id', validate({ params: idParamSchema }), controller.delete);
  router.post(
    '/:id/condense',
    validate({ params: idParamSchema }),
    controller.condense,
  );
  router.post(
    '/:id/generate-quiz',
    validate({ params: idParamSchema }),
    quizController.generateFromNote,
  );

  return router;
};
