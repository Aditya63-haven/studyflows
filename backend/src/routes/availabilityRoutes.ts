import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { AvailabilityController } from '../controllers/AvailabilityController';
import {
  dayAvailabilitySchema,
  saveAvailabilitySchema,
  weekdayParamSchema,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export const createAvailabilityRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new AvailabilityController(container.availabilityService);

  router.use(auth);
  router.get('/', controller.get);
  router.put(
    '/',
    validate({ body: saveAvailabilitySchema }),
    controller.saveWeek,
  );
  router.put(
    '/:weekday',
    validate({ params: weekdayParamSchema, body: dayAvailabilitySchema }),
    controller.saveDay,
  );

  return router;
};
