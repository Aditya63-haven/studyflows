import { Server } from 'http';
import createApp from './app';
import { Config } from './config/Config';
import { Database } from './config/Database';

let httpServer: Server | null = null;
let shuttingDown = false;

/**
 * Starts MongoDB, then the HTTP server.
 */
const bootstrap = async (): Promise<void> => {
  const config = Config.getInstance();
  const database = Database.getInstance();

  await database.connect(config.mongodbUri);

  const app = createApp();
  httpServer = app.listen(config.port, () => {
    console.info(`[server] StudyFlows API listening on http://localhost:${config.port}`);
  });
};

/**
 * Closes the HTTP server and MongoDB connection exactly once.
 */
const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.info(`[server] ${signal} received, shutting down`);

  if (httpServer) {
    await new Promise<void>((resolve, reject) => {
      httpServer?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  await Database.getInstance().disconnect();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
  void shutdown('SIGTERM');
});

process.on('uncaughtException', (error) => {
  console.error('[server] Uncaught exception:', error);
  void shutdown('SIGTERM');
});

void bootstrap().catch((error) => {
  console.error('[server] Failed to start StudyFlows API:', error);
  process.exit(1);
});
