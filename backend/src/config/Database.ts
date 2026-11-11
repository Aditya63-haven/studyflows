import mongoose, { Connection } from 'mongoose';

/**
 * Owns the single Mongoose connection for the application.
 *
 * OOP: Singleton - there is exactly one connection manager per process and it
 * is obtained through `getInstance()`.
 * OOP: Encapsulation - the underlying connection and connect promise are
 * private; callers interact through a small public API.
 */
export class Database {
  private static instance: Database | null = null;

  private readonly connection: Connection;
  private connectPromise: Promise<typeof mongoose> | null = null;

  private constructor() {
    this.connection = mongoose.connection;
    this.registerListeners();
  }

  /**
   * Returns the process-wide database connection manager.
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Connects to MongoDB. Calling this while already connected is a no-op.
   *
   * @param uri MongoDB connection string
   */
  public async connect(uri: string): Promise<void> {
    if (this.connection.readyState === 1) {
      return;
    }

    if (!this.connectPromise) {
      this.connectPromise = mongoose
        .connect(uri, { serverSelectionTimeoutMS: 10_000 })
        .finally(() => {
          this.connectPromise = null;
        });
    }

    await this.connectPromise;
  }

  /**
   * Closes the MongoDB connection if one is open.
   */
  public async disconnect(): Promise<void> {
    if (this.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  public getConnection(): Connection {
    return this.connection;
  }

  public isConnected(): boolean {
    return this.connection.readyState === 1;
  }

  private registerListeners(): void {
    this.connection.on('connected', () => {
      console.info('[Database] MongoDB connected');
    });

    this.connection.on('error', (error: Error) => {
      console.error('[Database] MongoDB connection error:', error.message);
    });

    this.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected');
    });
  }
}
