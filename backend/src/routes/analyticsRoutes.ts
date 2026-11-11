import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { AnalyticsController } from '../controllers/AnalyticsController';

export const createAnalyticsRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new AnalyticsController(container.analyticsService);

  router.use(auth);
  router.get('/', controller.overview);

  return router;
};
