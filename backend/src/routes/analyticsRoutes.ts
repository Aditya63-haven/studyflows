import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { AnalyticsController } from '../controllers/AnalyticsController';
import {
  idParamSchema,
  performanceFiltersSchema,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export const createAnalyticsRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new AnalyticsController(
    container.analyticsService,
    container.performanceAnalysisService,
  );

  router.use(auth);
  router.get('/', controller.overview);
  router.get(
    '/performance',
    validate({ query: performanceFiltersSchema }),
    controller.performance,
  );
  router.post(
    '/performance/recommendations/:id/accept',
    validate({ params: idParamSchema, query: performanceFiltersSchema }),
    controller.acceptRecommendation,
  );

  return router;
};
