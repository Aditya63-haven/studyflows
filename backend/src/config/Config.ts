import { resolve } from 'path';
import dotenv from 'dotenv';

export type NodeEnv = 'development' | 'test' | 'production';
export type AIProviderName = 'mock' | 'external' | 'gemini' | 'openai-compatible';
export type AIJsonResponseFormat = 'none' | 'json_object';
export type AIReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';
export type RevisionStrategyName = 'sm2' | 'simple';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  private readonly _aiModel: string;
  private readonly _aiJsonResponseFormat: AIJsonResponseFormat;
  private readonly _aiReasoningEffort: AIReasoningEffort | undefined;
  private readonly _aiExtraRequestParams: Readonly<Record<string, unknown>> | undefined;
  private readonly _aiAccessAdminEmail: string | undefined;
  private readonly _aiMaxInputChars: number;
  private readonly _aiMaxOutputTokens: number;
  private readonly _aiMaxContextChars: number;
  private readonly _aiMaxNoteChars: number;
  private readonly _aiMaxDocumentContextChars: number;
  private readonly _aiMaxHistoryMessages: number;
  private readonly _aiUserRequestsPerMinute: number;
  private readonly _aiGlobalRequestsPerMinute: number;
  private readonly _aiRequestTimeoutMs: number;
  private readonly _revisionStrategy: RevisionStrategyName;
  private readonly _avatarStorageDir: string;
  private readonly _documentMaxBytes: number;
  private readonly _documentMaxPages: number;
  private readonly _documentMaxExtractedChars: number;
  private readonly _documentChunkSize: number;
  private readonly _documentChunkOverlap: number;
  private readonly _documentMaxChunks: number;
  private readonly _documentStorageDir: string;

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
    this._aiModel =
      Config.optionalEnv('AI_MODEL') ??
      (this._aiProvider === 'gemini' ? 'gemini-3.8-flash' : '');
    this._aiJsonResponseFormat = Config.parseJsonResponseFormat(
      process.env.AI_JSON_RESPONSE_FORMAT,
    );
    this._aiReasoningEffort = Config.parseReasoningEffort(process.env.AI_REASONING_EFFORT);
    this._aiExtraRequestParams = Config.parseExtraRequestParams(
      process.env.AI_EXTRA_REQUEST_PARAMS,
    );
    Config.assertAIProviderConfig(
      this._aiProvider,
      this._aiApiKey,
      this._aiBaseUrl,
      this._aiModel,
    );
    this._aiAccessAdminEmail = Config.parseOptionalEmail(process.env.AI_ACCESS_ADMIN_EMAIL);
    this._aiMaxInputChars = Config.parsePositiveInt('AI_MAX_INPUT_CHARS', 24_000);
    this._aiMaxOutputTokens = Config.parsePositiveInt('AI_MAX_OUTPUT_TOKENS', 2_048);
    this._aiMaxContextChars = Config.parsePositiveInt('AI_MAX_CONTEXT_CHARS', 12_000);
    this._aiMaxNoteChars = Config.parsePositiveInt('AI_MAX_NOTE_CHARS', 4_000);
    this._aiMaxDocumentContextChars = Config.parsePositiveInt(
      'AI_MAX_DOCUMENT_CONTEXT_CHARS',
      6_000,
    );
    this._aiMaxHistoryMessages = Config.parseNonNegativeInt('AI_MAX_HISTORY_MESSAGES', 12);
    this._aiUserRequestsPerMinute = Config.parsePositiveInt('AI_USER_REQUESTS_PER_MINUTE', 12);
    this._aiGlobalRequestsPerMinute = Config.parsePositiveInt(
      'AI_GLOBAL_REQUESTS_PER_MINUTE',
      60,
    );
    this._aiRequestTimeoutMs = Config.parsePositiveInt('AI_REQUEST_TIMEOUT_MS', 30_000);

    if (this._aiMaxNoteChars > this._aiMaxContextChars) {
      throw new Error('[Config] AI_MAX_NOTE_CHARS cannot exceed AI_MAX_CONTEXT_CHARS');
    }
    if (this._aiMaxDocumentContextChars > this._aiMaxContextChars) {
      throw new Error(
        '[Config] AI_MAX_DOCUMENT_CONTEXT_CHARS cannot exceed AI_MAX_CONTEXT_CHARS',
      );
    }

    this._revisionStrategy = Config.parseRevisionStrategy(process.env.REVISION_STRATEGY);
    this._avatarStorageDir = resolve(Config.optionalEnv('AVATAR_STORAGE_DIR') ?? 'storage/avatars');

    this._documentMaxBytes = Config.parsePositiveInt('DOCUMENT_MAX_BYTES', 10 * 1024 * 1024);
    this._documentMaxPages = Config.parsePositiveInt('DOCUMENT_MAX_PAGES', 300);
    this._documentMaxExtractedChars = Config.parsePositiveInt(
      'DOCUMENT_MAX_EXTRACTED_CHARS',
      500_000,
    );
    this._documentChunkSize = Config.parsePositiveInt('DOCUMENT_CHUNK_SIZE', 1_200);
    this._documentChunkOverlap = Config.parseNonNegativeInt('DOCUMENT_CHUNK_OVERLAP', 200);
    if (this._documentChunkOverlap >= this._documentChunkSize) {
      throw new Error('[Config] DOCUMENT_CHUNK_OVERLAP must be smaller than DOCUMENT_CHUNK_SIZE');
    }
    this._documentMaxChunks = Config.parsePositiveInt('DOCUMENT_MAX_CHUNKS', 2_000);
    this._documentStorageDir = resolve(
      Config.optionalEnv('DOCUMENT_STORAGE_DIR') ?? 'storage/documents',
    );
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

  public get aiModel(): string {
    return this._aiModel;
  }

  public get aiJsonResponseFormat(): AIJsonResponseFormat {
    return this._aiJsonResponseFormat;
  }

  public get aiReasoningEffort(): AIReasoningEffort | undefined {
    return this._aiReasoningEffort;
  }

  public get aiExtraRequestParams(): Readonly<Record<string, unknown>> | undefined {
    return this._aiExtraRequestParams;
  }

  public get aiAccessAdminEmail(): string | undefined {
    return this._aiAccessAdminEmail;
  }

  public get aiMaxInputChars(): number {
    return this._aiMaxInputChars;
  }

  public get aiMaxOutputTokens(): number {
    return this._aiMaxOutputTokens;
  }

  public get aiMaxContextChars(): number {
    return this._aiMaxContextChars;
  }

  public get aiMaxNoteChars(): number {
    return this._aiMaxNoteChars;
  }

  public get aiMaxDocumentContextChars(): number {
    return this._aiMaxDocumentContextChars;
  }

  public get aiMaxHistoryMessages(): number {
    return this._aiMaxHistoryMessages;
  }

  public get aiUserRequestsPerMinute(): number {
    return this._aiUserRequestsPerMinute;
  }

  public get aiGlobalRequestsPerMinute(): number {
    return this._aiGlobalRequestsPerMinute;
  }

  public get aiRequestTimeoutMs(): number {
    return this._aiRequestTimeoutMs;
  }

  public get revisionStrategy(): RevisionStrategyName {
    return this._revisionStrategy;
  }

  public get avatarStorageDir(): string {
    return this._avatarStorageDir;
  }

  public get documentMaxBytes(): number {
    return this._documentMaxBytes;
  }

  public get documentMaxPages(): number {
    return this._documentMaxPages;
  }

  public get documentMaxExtractedChars(): number {
    return this._documentMaxExtractedChars;
  }

  public get documentChunkSize(): number {
    return this._documentChunkSize;
  }

  public get documentChunkOverlap(): number {
    return this._documentChunkOverlap;
  }

  public get documentMaxChunks(): number {
    return this._documentMaxChunks;
  }

  public get documentStorageDir(): string {
    return this._documentStorageDir;
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

  private static parsePositiveInt(name: string, fallback: number): number {
    const raw = Config.optionalEnv(name);
    if (!raw) {
      return fallback;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`[Config] ${name} must be a positive integer (received "${raw}")`);
    }
    return value;
  }

  private static parseNonNegativeInt(name: string, fallback: number): number {
    const raw = Config.optionalEnv(name);
    if (!raw) {
      return fallback;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`[Config] ${name} must be a non-negative integer (received "${raw}")`);
    }
    return value;
  }

  private static parseOptionalEmail(value: string | undefined): string | undefined {
    const email = value?.trim().toLowerCase();
    if (!email) {
      return undefined;
    }
    if (!EMAIL_PATTERN.test(email)) {
      throw new Error('[Config] AI_ACCESS_ADMIN_EMAIL must be a valid email address');
    }
    return email;
  }

  private static parseAIProvider(value: string | undefined): AIProviderName {
    const provider = (value ?? 'mock').trim().toLowerCase();
    if (
      provider === 'mock' ||
      provider === 'external' ||
      provider === 'gemini' ||
      provider === 'openai-compatible'
    ) {
      return provider;
    }
    throw new Error(
      `[Config] AI_PROVIDER must be "mock", "external", "gemini" or "openai-compatible" (received "${provider}")`,
    );
  }

  private static assertAIProviderConfig(
    provider: AIProviderName,
    apiKey: string | undefined,
    baseUrl: string | undefined,
    model: string,
  ): void {
    if (provider === 'mock') {
      return;
    }
    if (!apiKey) {
      throw new Error(`[Config] AI_API_KEY is required when AI_PROVIDER=${provider}`);
    }

    if (provider === 'gemini') {
      if (!model) {
        throw new Error('[Config] AI_MODEL is required when AI_PROVIDER=gemini');
      }
      return;
    }

    if (!baseUrl) {
      throw new Error(`[Config] AI_BASE_URL is required when AI_PROVIDER=${provider}`);
    }
    Config.assertHttpUrl('AI_BASE_URL', baseUrl);

    if (provider === 'openai-compatible' && !model) {
      throw new Error(
        '[Config] AI_MODEL is required when AI_PROVIDER=openai-compatible',
      );
    }
  }

  private static assertHttpUrl(name: string, value: string): void {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`[Config] ${name} must be a valid HTTP or HTTPS URL`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`[Config] ${name} must be a valid HTTP or HTTPS URL`);
    }
  }

  private static parseJsonResponseFormat(
    value: string | undefined,
  ): AIJsonResponseFormat {
    const format = (value?.trim() || 'none').toLowerCase();
    if (format === 'none' || format === 'json_object') {
      return format;
    }
    throw new Error(
      `[Config] AI_JSON_RESPONSE_FORMAT must be "none" or "json_object" (received "${format}")`,
    );
  }

  private static parseReasoningEffort(
    value: string | undefined,
  ): AIReasoningEffort | undefined {
    const effort = value?.trim().toLowerCase();
    if (!effort) {
      return undefined;
    }
    if (
      effort === 'minimal' ||
      effort === 'low' ||
      effort === 'medium' ||
      effort === 'high'
    ) {
      return effort;
    }
    throw new Error(
      `[Config] AI_REASONING_EFFORT must be "minimal", "low", "medium" or "high" (received "${effort}")`,
    );
  }

  private static parseExtraRequestParams(
    value: string | undefined,
  ): Readonly<Record<string, unknown>> | undefined {
    const raw = value?.trim();
    if (!raw) {
      return undefined;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('[Config] AI_EXTRA_REQUEST_PARAMS must be valid JSON');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('[Config] AI_EXTRA_REQUEST_PARAMS must be a JSON object');
    }

    const reserved = [
      'model',
      'messages',
      'max_tokens',
      'stream',
      'response_format',
      'reasoning_effort',
    ];
    for (const key of Object.keys(parsed)) {
      if (reserved.includes(key)) {
        throw new Error(
          `[Config] AI_EXTRA_REQUEST_PARAMS must not override the reserved field "${key}"`,
        );
      }
    }
    return parsed as Record<string, unknown>;
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
