import cors from 'cors';
import express, { Express } from 'express';
import { AppContainer, createContainer } from './container';
import { errorMiddleware } from './middleware/errorMiddleware';
import { notFoundMiddleware } from './middleware/notFoundMiddleware';
import { createApiRouter } from './routes';

/**
 * Builds the Express application without starting a listener or connecting to
 * MongoDB, which keeps the app easy to exercise in tests.
 */
export const createApp = (container: AppContainer = createContainer()): Express => {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.disable('x-powered-by');
  app.use(
    cors({
      origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', createApiRouter(container));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};

export default createApp;
