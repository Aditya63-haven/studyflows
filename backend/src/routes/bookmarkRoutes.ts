import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { BookmarkController } from '../controllers/BookmarkController';
import {
  createBookmarkSchema,
  idParamSchema,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export const createBookmarkRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new BookmarkController(container.bookmarkService);

  router.use(auth);
  router.get('/', controller.list);
  router.post('/', validate({ body: createBookmarkSchema }), controller.create);
  router.delete('/:id', validate({ params: idParamSchema }), controller.delete);

  return router;
};
