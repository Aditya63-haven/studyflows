type Config = import('../src/config/Config').Config;

const baseEnv = { ...process.env };

const loadConfig = (overrides: NodeJS.ProcessEnv = {}): Config => {
  jest.resetModules();
  process.env = {
    ...baseEnv,
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/studyflows-test',
    JWT_SECRET: 'unit-test-secret',
    AI_PROVIDER: 'mock',
    AI_API_KEY: '',
    AI_BASE_URL: '',
    AI_MODEL: '',
    AI_JSON_RESPONSE_FORMAT: '',
    AI_REASONING_EFFORT: '',
    AI_EXTRA_REQUEST_PARAMS: '',
    ...overrides,
  };

  const { Config } = require('../src/config/Config') as typeof import('../src/config/Config');
  return Config.getInstance();
};

afterEach(() => {
  process.env = baseEnv;
  jest.resetModules();
});

describe('AI provider configuration', () => {
  it('loads OpenAI-compatible provider settings and optional request tuning', () => {
    const config = loadConfig({
      AI_PROVIDER: 'openai-compatible',
      AI_API_KEY: 'test-key',
      AI_BASE_URL: 'https://api.deepseek.com',
      AI_MODEL: 'deepseek-flash',
      AI_JSON_RESPONSE_FORMAT: 'json_object',
      AI_REASONING_EFFORT: 'low',
      AI_EXTRA_REQUEST_PARAMS: '{"temperature":0.2,"top_p":0.9}',
    });

    expect(config.aiProvider).toBe('openai-compatible');
    expect(config.aiApiKey).toBe('test-key');
    expect(config.aiBaseUrl).toBe('https://api.deepseek.com');
    expect(config.aiModel).toBe('deepseek-flash');
    expect(config.aiJsonResponseFormat).toBe('json_object');
    expect(config.aiReasoningEffort).toBe('low');
    expect(config.aiExtraRequestParams).toEqual({ temperature: 0.2, top_p: 0.9 });
  });

  it('requires credentials, base URL and model for OpenAI-compatible providers', () => {
    const required = {
      AI_PROVIDER: 'openai-compatible' as const,
      AI_API_KEY: 'test-key',
      AI_BASE_URL: 'https://api.example.com/v1',
      AI_MODEL: 'test-model',
    };

    expect(() => loadConfig({ ...required, AI_API_KEY: '' })).toThrow(
      '[Config] AI_API_KEY is required',
    );
    expect(() => loadConfig({ ...required, AI_BASE_URL: '' })).toThrow(
      '[Config] AI_BASE_URL is required',
    );
    expect(() => loadConfig({ ...required, AI_MODEL: '' })).toThrow(
      '[Config] AI_MODEL is required',
    );
  });

  it('rejects invalid base URLs and optional request settings', () => {
    const required = {
      AI_PROVIDER: 'openai-compatible' as const,
      AI_API_KEY: 'test-key',
      AI_BASE_URL: 'https://api.example.com/v1',
      AI_MODEL: 'test-model',
    };

    expect(() => loadConfig({ ...required, AI_BASE_URL: 'not-a-url' })).toThrow(
      '[Config] AI_BASE_URL must be a valid HTTP or HTTPS URL',
    );
    expect(() => loadConfig({ ...required, AI_BASE_URL: 'ftp://example.com' })).toThrow(
      '[Config] AI_BASE_URL must be a valid HTTP or HTTPS URL',
    );
    expect(() => loadConfig({ ...required, AI_JSON_RESPONSE_FORMAT: 'json' })).toThrow(
      '[Config] AI_JSON_RESPONSE_FORMAT',
    );
    expect(() => loadConfig({ ...required, AI_REASONING_EFFORT: 'extreme' })).toThrow(
      '[Config] AI_REASONING_EFFORT',
    );
  });

  it('validates extra request parameters and reserved fields', () => {
    const required = {
      AI_PROVIDER: 'openai-compatible' as const,
      AI_API_KEY: 'test-key',
      AI_BASE_URL: 'https://api.example.com/v1',
      AI_MODEL: 'test-model',
    };

    expect(() => loadConfig({ ...required, AI_EXTRA_REQUEST_PARAMS: 'not json' })).toThrow(
      '[Config] AI_EXTRA_REQUEST_PARAMS must be valid JSON',
    );
    expect(() => loadConfig({ ...required, AI_EXTRA_REQUEST_PARAMS: '[]' })).toThrow(
      '[Config] AI_EXTRA_REQUEST_PARAMS must be a JSON object',
    );
    expect(() =>
      loadConfig({ ...required, AI_EXTRA_REQUEST_PARAMS: '{"model":"override"}' }),
    ).toThrow('must not override the reserved field "model"');
  });

  it('keeps native Gemini defaults and legacy providers working', () => {
    const gemini = loadConfig({
      AI_PROVIDER: 'gemini',
      AI_API_KEY: 'test-key',
      AI_MODEL: '',
    });
    expect(gemini.aiProvider).toBe('gemini');
    expect(gemini.aiModel).toBe('gemini-3.8-flash');

    const external = loadConfig({
      AI_PROVIDER: 'external',
      AI_API_KEY: 'test-key',
      AI_BASE_URL: 'https://legacy.example.com',
      AI_MODEL: '',
    });
    expect(external.aiProvider).toBe('external');

    const mock = loadConfig({ AI_PROVIDER: 'mock' });
    expect(mock.aiProvider).toBe('mock');
    expect(mock.aiApiKey).toBeUndefined();
  });

  it('rejects unsupported provider names', () => {
    expect(() => loadConfig({ AI_PROVIDER: 'unknown' })).toThrow(
      '[Config] AI_PROVIDER must be "mock", "external", "gemini" or "openai-compatible"',
    );
  });
});
