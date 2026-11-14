import { RequestHandler, Router } from 'express';
import { AppContainer } from '../container';
import { DocumentController } from '../controllers/DocumentController';
import { createDocumentUpload } from '../middleware/documentUpload';
import { idParamSchema, spaceIdParamSchema } from '../validation/schemas';
import { validate } from '../validation/validate';

export const createSpaceDocumentRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router({ mergeParams: true });
  const controller = new DocumentController(container.documentService);
  const upload = createDocumentUpload(container.config.documentMaxBytes);

  router.use(auth);
  router.get(
    '/',
    validate({ params: spaceIdParamSchema }),
    controller.listBySpace,
  );
  router.post(
    '/',
    validate({ params: spaceIdParamSchema }),
    upload,
    controller.upload,
  );

  return router;
};

export const createDocumentRoutes = (
  container: AppContainer,
  auth: RequestHandler,
): Router => {
  const router = Router();
  const controller = new DocumentController(container.documentService);

  router.use(auth);
  router.get('/:id', validate({ params: idParamSchema }), controller.get);
  router.get(
    '/:id/file',
    validate({ params: idParamSchema }),
    controller.download,
  );
  router.delete('/:id', validate({ params: idParamSchema }), controller.delete);

  return router;
};
