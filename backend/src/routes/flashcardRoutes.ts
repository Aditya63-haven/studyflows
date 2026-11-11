import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { FlashcardController } from '../controllers/FlashcardController';
import {
  createDeckSchema,
  deckCardParamsSchema,
  idParamSchema,
  reviewCardSchema,
  spaceIdParamSchema,
  updateDeckSchema,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export const createSpaceFlashcardRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router({ mergeParams: true });
  const controller = new FlashcardController(container.flashcardService);

  router.use(auth);
  router.get(
    '/',
    validate({ params: spaceIdParamSchema }),
    controller.listBySpace,
  );
  router.post(
    '/',
    validate({ params: spaceIdParamSchema, body: createDeckSchema }),
    controller.create,
  );

  return router;
};

export const createFlashcardRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new FlashcardController(container.flashcardService);

  router.use(auth);
  router.get('/:id', validate({ params: idParamSchema }), controller.get);
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: updateDeckSchema }),
    controller.update,
  );
  router.delete('/:id', validate({ params: idParamSchema }), controller.delete);
  router.post(
    '/:id/cards/:cardId/review',
    validate({ params: deckCardParamsSchema, body: reviewCardSchema }),
    controller.reviewCard,
  );

  return router;
};
