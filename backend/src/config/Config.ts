import { resolve } from 'path';
import dotenv from 'dotenv';

export type NodeEnv = 'development' | 'test' | 'production';
export type AIProviderName = 'mock' | 'external';
export type RevisionStrategyName = 'sm2' | 'simple';

/**
 * Application configuration loaded once from environment variables.
 *
 * OOP: Singleton - the private constructor plus `getInstance()` guarantee a
 * single, consistent configuration object for the whole process.
 * OOP: Encapsulation - values are stored privately and exposed through
 * read-only getters.
 */
export class Config {
  private static instance: Config | null = null;

  private readonly _nodeEnv: NodeEnv;
  private readonly _port: number;
  private readonly _mongodbUri: string;
  private readonly _jwtSecret: string;
  private readonly _jwtExpiresIn: string;
  private readonly _corsOrigin: string;
  private readonly _aiProvider: AIProviderName;
  private readonly _aiApiKey: string | undefined;
  private readonly _aiBaseUrl: string | undefined;
  private readonly _revisionStrategy: RevisionStrategyName;

  private constructor() {
    dotenv.config({ path: resolve(__dirname, '../../.env') });

    this._nodeEnv = Config.parseNodeEnv(process.env.NODE_ENV);
    this._port = Config.parsePort(process.env.PORT);
    this._mongodbUri = Config.requireEnv('MONGODB_URI');
    this._jwtSecret = Config.requireEnv('JWT_SECRET');
    this._jwtExpiresIn = Config.optionalEnv('JWT_EXPIRES_IN') ?? '7d';
    this._corsOrigin = Config.optionalEnv('CORS_ORIGIN') ?? 'http://localhost:5173';
    this._aiProvider = Config.parseAIProvider(process.env.AI_PROVIDER);
    this._aiApiKey = Config.optionalEnv('AI_API_KEY');
    this._aiBaseUrl = Config.optionalEnv('AI_BASE_URL');
    this._revisionStrategy = Config.parseRevisionStrategy(process.env.REVISION_STRATEGY);
  }

  /**
   * Returns the process-wide configuration instance.
   */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public get nodeEnv(): NodeEnv {
    return this._nodeEnv;
  }

  public get port(): number {
    return this._port;
  }

  public get mongodbUri(): string {
    return this._mongodbUri;
  }

  public get jwtSecret(): string {
    return this._jwtSecret;
  }

  public get jwtExpiresIn(): string {
    return this._jwtExpiresIn;
  }

  public get corsOrigin(): string {
    return this._corsOrigin;
  }

  public get aiProvider(): AIProviderName {
    return this._aiProvider;
  }

  public get aiApiKey(): string | undefined {
    return this._aiApiKey;
  }

  public get aiBaseUrl(): string | undefined {
    return this._aiBaseUrl;
  }

  public get revisionStrategy(): RevisionStrategyName {
    return this._revisionStrategy;
  }

  public get isProduction(): boolean {
    return this._nodeEnv === 'production';
  }

  private static requireEnv(name: string): string {
    const value = Config.optionalEnv(name);
    if (!value) {
      throw new Error(`[Config] Missing required environment variable: ${name}`);
    }
    return value;
  }

  private static optionalEnv(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
  }

  private static parseNodeEnv(value: string | undefined): NodeEnv {
    const nodeEnv = (value ?? 'development').trim();
    if (nodeEnv === 'development' || nodeEnv === 'test' || nodeEnv === 'production') {
      return nodeEnv;
    }
    throw new Error(
      `[Config] NODE_ENV must be one of development, test, production (received "${nodeEnv}")`,
    );
  }

  private static parsePort(value: string | undefined): number {
    const port = Number(value ?? '4000');
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`[Config] PORT must be an integer between 1 and 65535 (received "${value}")`);
    }
    return port;
  }

  private static parseAIProvider(value: string | undefined): AIProviderName {
    const provider = (value ?? 'mock').trim().toLowerCase();
    if (provider === 'mock' || provider === 'external') {
      return provider;
    }
    throw new Error(`[Config] AI_PROVIDER must be "mock" or "external" (received "${provider}")`);
  }

  private static parseRevisionStrategy(value: string | undefined): RevisionStrategyName {
    const strategy = (value ?? 'sm2').trim().toLowerCase();
    if (strategy === 'sm2' || strategy === 'simple') {
      return strategy;
    }
    throw new Error(
      `[Config] REVISION_STRATEGY must be "sm2" or "simple" (received "${strategy}")`,
    );
  }
}
