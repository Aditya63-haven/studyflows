import { Router } from 'express';

const healthRouter = Router();

/**
 * Lightweight liveness endpoint. It does not require the database.
 */
healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'studyflows-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default healthRouter;
