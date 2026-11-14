import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { AssistantController } from '../controllers/AssistantController';
import {
  assistantApplySchema,
  assistantChatSchema,
  assistantCommandSchema,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export const createAssistantRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new AssistantController(container.assistantService);

  router.use(auth);
  router.post(
    '/chat',
    validate({ body: assistantChatSchema }),
    controller.chat,
  );
  router.post(
    '/command',
    validate({ body: assistantCommandSchema }),
    controller.command,
  );
  router.post(
    '/apply',
    validate({ body: assistantApplySchema }),
    controller.apply,
  );

  return router;
};
