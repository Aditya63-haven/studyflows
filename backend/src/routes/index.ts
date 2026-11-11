import { Router } from 'express';
import { AppContainer } from '../container';
import { createAuthMiddleware } from '../middleware/authMiddleware';
import healthRouter from './healthRoutes';
import { createAuthRoutes } from './authRoutes';
import { createSpaceRoutes } from './spaceRoutes';
import { createNoteRoutes } from './noteRoutes';
import { createQuizRoutes } from './quizRoutes';
import { createFlashcardRoutes } from './flashcardRoutes';
import { createRevisionRoutes } from './revisionRoutes';
import { createExamPlanRoutes } from './examPlanRoutes';
import { createAnalyticsRoutes } from './analyticsRoutes';
import { createPublicRoutes, createShareRoutes } from './shareRoutes';
import { createBookmarkRoutes } from './bookmarkRoutes';
import { createSearchRoutes } from './searchRoutes';
import { createSessionRoutes } from './studySessionRoutes';

export const createApiRouter = (container: AppContainer): Router => {
  const apiRouter = Router();
  const auth = createAuthMiddleware(container.authService);

  apiRouter.use('/health', healthRouter);
  apiRouter.use('/auth', createAuthRoutes(container, auth));
  apiRouter.use('/spaces', createSpaceRoutes(container, auth));
  apiRouter.use('/notes', createNoteRoutes(container, auth));
  apiRouter.use('/quizzes', createQuizRoutes(container, auth));
  apiRouter.use('/decks', createFlashcardRoutes(container, auth));
  apiRouter.use('/revision', createRevisionRoutes(container, auth));
  apiRouter.use('/exam-plans', createExamPlanRoutes(container, auth));
  apiRouter.use('/analytics', createAnalyticsRoutes(container, auth));
  apiRouter.use('/sessions', createSessionRoutes(container, auth));
  apiRouter.use('/bookmarks', createBookmarkRoutes(container, auth));
  apiRouter.use('/search', createSearchRoutes(container, auth));
  apiRouter.use('/share', createShareRoutes(container, auth));
  apiRouter.use('/public', createPublicRoutes(container));

  return apiRouter;
};

export default createApiRouter;
