import { createAIProvider } from '../src/container';
import { Config } from '../src/config/Config';
import { ExternalAIProvider } from '../src/patterns/adapter/ExternalAIProvider';
import { GeminiAIProvider } from '../src/patterns/adapter/GeminiAIProvider';
import { MockAIProvider } from '../src/patterns/adapter/MockAIProvider';
import { OpenAICompatibleAIProvider } from '../src/patterns/adapter/OpenAICompatibleAIProvider';

const makeConfig = (overrides: Record<string, unknown> = {}): Config =>
  ({
    aiProvider: 'mock',
    aiApiKey: undefined,
    aiBaseUrl: undefined,
    aiModel: '',
    aiMaxInputChars: 20_000,
    aiMaxOutputTokens: 1_024,
    aiRequestTimeoutMs: 5_000,
    aiJsonResponseFormat: 'none',
    aiReasoningEffort: undefined,
    aiExtraRequestParams: undefined,
    ...overrides,
  }) as unknown as Config;

describe('createAIProvider selection', () => {
  it('selects the OpenAI-compatible adapter from configuration', () => {
    const provider = createAIProvider(
      makeConfig({
        aiProvider: 'openai-compatible',
        aiApiKey: 'test-key',
        aiBaseUrl: 'https://api.deepseek.com',
        aiModel: 'deepseek-flash',
        aiJsonResponseFormat: 'json_object',
        aiReasoningEffort: 'low',
        aiExtraRequestParams: { temperature: 0.2 },
      }),
    );

    expect(provider).toBeInstanceOf(OpenAICompatibleAIProvider);
    expect(provider.name).toBe('openai-compatible');
  });

  it('keeps mock, external and native Gemini selection working', () => {
    expect(createAIProvider(makeConfig())).toBeInstanceOf(MockAIProvider);

    expect(
      createAIProvider(
        makeConfig({
          aiProvider: 'external',
          aiApiKey: 'test-key',
          aiBaseUrl: 'https://legacy.example.com',
        }),
      ),
    ).toBeInstanceOf(ExternalAIProvider);

    expect(
      createAIProvider(
        makeConfig({
          aiProvider: 'gemini',
          aiApiKey: 'test-key',
          aiModel: 'gemini-3.8-flash',
        }),
      ),
    ).toBeInstanceOf(GeminiAIProvider);
  });

  it('fails fast when OpenAI-compatible settings are incomplete', () => {
    expect(() =>
      createAIProvider(
        makeConfig({
          aiProvider: 'openai-compatible',
          aiApiKey: 'test-key',
          aiBaseUrl: '',
          aiModel: 'test-model',
        }),
      ),
    ).toThrow('AI_API_KEY, AI_BASE_URL and AI_MODEL are required');
  });
});
