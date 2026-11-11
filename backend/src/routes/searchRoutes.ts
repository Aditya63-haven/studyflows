import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { SearchController } from '../controllers/SearchController';
import { searchQuerySchema } from '../validation/schemas';
import { validate } from '../validation/validate';

export const createSearchRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new SearchController(container.searchService);

  router.use(auth);
  router.get('/', validate({ query: searchQuerySchema }), controller.search);

  return router;
};
