import {
  AIExamPreparationInput,
  AIPerformanceInput,
} from '../src/domain/interfaces/IAIProvider';
import {
  buildChatCompletionsUrl,
  OpenAICompatibleAIProvider,
  OpenAICompatibleFetch,
  OpenAICompatibleHttpResponse,
  OpenAICompatibleProviderOptions,
} from '../src/patterns/adapter/OpenAICompatibleAIProvider';

const options: OpenAICompatibleProviderOptions = {
  apiKey: 'test-key',
  baseUrl: 'https://api.example.com/v1/',
  model: 'test-model',
  maxInputChars: 20_000,
  maxOutputTokens: 1_024,
  timeoutMs: 5_000,
};

interface RequestBody {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens: number;
  response_format?: { type: string };
  reasoning_effort?: string;
  temperature?: number;
  top_p?: number;
}

const jsonResponse = (
  body: unknown,
  status = 200,
): OpenAICompatibleHttpResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const contentResponse = (content: string): OpenAICompatibleHttpResponse =>
  jsonResponse({ choices: [{ message: { role: 'assistant', content } }] });

const makeProvider = (overrides: Partial<OpenAICompatibleProviderOptions> = {}) => {
  const fetchMock = jest.fn();
  const provider = new OpenAICompatibleAIProvider(
    { ...options, ...overrides },
    fetchMock as unknown as OpenAICompatibleFetch,
  );
  return { provider, fetchMock };
};

const getRequest = (fetchMock: jest.Mock) => {
  const [url, init] = fetchMock.mock.calls[0] as [
    string,
    { method: string; headers: Record<string, string>; body: string },
  ];
  return {
    url,
    init,
    body: JSON.parse(init.body) as RequestBody,
  };
};

describe('OpenAICompatibleAIProvider', () => {
  it('normalizes chat completion endpoint URLs', () => {
    expect(buildChatCompletionsUrl('https://api.deepseek.com/'))
      .toBe('https://api.deepseek.com/chat/completions');
    expect(buildChatCompletionsUrl('https://api.openai.com/v1'))
      .toBe('https://api.openai.com/v1/chat/completions');
    expect(buildChatCompletionsUrl('https://example.com/v1/chat/completions'))
      .toBe('https://example.com/v1/chat/completions');
    expect(() => buildChatCompletionsUrl('')).toThrow('AI_BASE_URL');
  });

  it('summarizes notes with the configured model, credentials and limits', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockResolvedValue(contentResponse('  A short summary.  '));

    const summary = await provider.summarizeNote({
      title: 'Graphs',
      content: 'Breadth-first search explores a graph level by level.',
    });

    expect(summary).toBe('A short summary.');
    const { url, init, body } = getRequest(fetchMock);
    expect(url).toBe('https://api.example.com/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(body.model).toBe('test-model');
    expect(body.max_tokens).toBe(1_024);
    expect(body.response_format).toBeUndefined();
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.messages[0]).toEqual(
      expect.objectContaining({ role: 'system' }),
    );
    expect(body.messages[0].content).toContain('StudyFlows');
    expect(body.messages[1].content).toContain('Breadth-first search');
  });

  it('sends optional request options only when configured', async () => {
    const { provider, fetchMock } = makeProvider({
      jsonResponseFormat: 'json_object',
      reasoningEffort: 'low',
      extraRequestParams: { temperature: 0.2, top_p: 0.9 },
    });
    fetchMock.mockResolvedValue(
      contentResponse(
        '{"questions":[{"type":"true_false","prompt":"BFS uses a queue.","correctAnswer":true}]}',
      ),
    );

    await provider.generateQuiz({
      title: 'Graphs',
      content: 'BFS uses a queue.',
      questionCount: 1,
    });

    const { body } = getRequest(fetchMock);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.reasoning_effort).toBe('low');
    expect(body.temperature).toBe(0.2);
    expect(body.top_p).toBe(0.9);
  });

  it('parses fenced quiz JSON and validates the question shape', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockResolvedValue(
      contentResponse(
        '```json\n{"questions":[{"type":"mcq","prompt":"Which structure does BFS use?","options":[{"id":"a","text":"Queue"},{"id":"b","text":"Stack"}],"correctOptionId":"a","explanation":"BFS uses a queue."},{"type":"true_false","prompt":"DFS uses a stack.","correctAnswer":true}]}\n```',
      ),
    );

    await expect(
      provider.generateQuiz({ title: 'Graphs', content: 'BFS and DFS.', questionCount: 2 }),
    ).resolves.toEqual([
      {
        type: 'mcq',
        prompt: 'Which structure does BFS use?',
        options: [
          { id: 'a', text: 'Queue' },
          { id: 'b', text: 'Stack' },
        ],
        correctOptionId: 'a',
        explanation: 'BFS uses a queue.',
      },
      {
        type: 'true_false',
        prompt: 'DFS uses a stack.',
        correctAnswer: true,
      },
    ]);
  });

  it('rejects quiz answers that reference unknown options', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockResolvedValue(
      contentResponse(
        '{"questions":[{"type":"mcq","prompt":"Broken","options":[{"id":"a","text":"A"},{"id":"b","text":"B"}],"correctOptionId":"c"}]}',
      ),
    );

    await expect(
      provider.generateQuiz({ title: 'Graphs', content: 'BFS uses a queue.' }),
    ).rejects.toMatchObject({ name: 'AppError', statusCode: 502 });
  });

  it('maps chat history and normalizes citations', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockResolvedValue(
      contentResponse(
        JSON.stringify({
          answer: 'BFS explores level by level.',
          citedNoteIds: ['note-1', 'note-1'],
          citedChunkIds: ['chunk-1', 'chunk-1'],
          usedExternalKnowledge: false,
        }),
      ),
    );

    const result = await provider.chat({
      message: 'What is BFS?',
      mode: 'answer',
      spaceName: 'Algorithms',
      spaceSubject: 'Computer Science',
      notes: [
        {
          id: 'note-1',
          title: 'Traversal',
          content: 'BFS explores a graph level by level.',
          tags: ['graphs'],
        },
      ],
      documents: [
        {
          id: 'doc-1',
          title: 'Lecture notes',
          format: 'txt',
          chunks: [
            {
              id: 'chunk-1',
              text: 'BFS uses a queue.',
              pageNumber: 1,
              section: 'Traversal',
            },
          ],
        },
      ],
      history: [
        { role: 'user', content: 'Earlier question' },
        { role: 'assistant', content: 'Earlier answer' },
      ],
    });

    expect(result).toEqual({
      answer: 'BFS explores level by level.',
      citedNoteIds: ['note-1'],
      citedChunkIds: ['chunk-1'],
      usedExternalKnowledge: false,
    });
    const { body } = getRequest(fetchMock);
    expect(body.messages.map((message) => message.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
    ]);
    expect(body.messages[1].content).toBe('Earlier question');
    expect(body.messages[2].content).toBe('Earlier answer');
    expect(body.messages[3].content).toContain('[NOTE note-1]');
    expect(body.messages[3].content).toContain('[DOCUMENT doc-1 CHUNK chunk-1');
    expect(body.messages[3].content).toContain('What is BFS?');
  });

  it('marks answers without context as external knowledge', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockResolvedValue(
      contentResponse('{"answer":"A general answer."}'),
    );

    const result = await provider.chat({
      message: 'What is a graph?',
      mode: 'explain',
      spaceName: '',
      spaceSubject: '',
      notes: [],
      history: [],
    });

    expect(result.usedExternalKnowledge).toBe(true);
  });

  it('validates command interpretations', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockResolvedValue(
      contentResponse(
        JSON.stringify({
          understood: true,
          action: 'move-work',
          strategy: 'weekend',
          planId: 'plan-1',
          response: '  Moving the missed work to the weekend.  ',
        }),
      ),
    );

    await expect(
      provider.interpretCommand({
        text: 'Move my missed work to the weekend',
        plans: [
          {
            id: 'plan-1',
            name: 'Biology Final',
            examDate: new Date('2026-04-10T09:00:00.000Z'),
            incompleteTopics: 2,
            missedMinutes: 60,
            keywords: ['biology'],
          },
        ],
        subjects: ['Biology'],
      }),
    ).resolves.toMatchObject({
      understood: true,
      action: 'move-work',
      strategy: 'weekend',
      planId: 'plan-1',
      response: 'Moving the missed work to the weekend.',
    });
  });

  it('sanitizes performance interpretations', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockResolvedValue(
      contentResponse(
        JSON.stringify({
          summary: 'Accuracy is low and declining.',
          strengths: ['Persistence', 'Persistence'],
          improvementAreas: ['Algebra'],
          trendInterpretation: 'Recent accuracy fell from 50% to 30%.',
          focusTopicIds: ['quiz-1', 'quiz-1'],
          practiceSuggestions: [
            { title: 'Practice equations', reason: 'Low accuracy.', topicId: 'quiz-1' },
            { title: '', reason: 'Missing title.', topicId: null },
          ],
        }),
      ),
    );

    const input = {
      generatedAt: '2026-05-15T12:00:00.000Z',
      weakTopics: [{ topicId: 'quiz-1', topicName: 'Algebra' }],
    } as unknown as AIPerformanceInput;

    await expect(provider.interpretPerformance(input)).resolves.toEqual({
      summary: 'Accuracy is low and declining.',
      strengths: ['Persistence'],
      improvementAreas: ['Algebra'],
      trendInterpretation: 'Recent accuracy fell from 50% to 30%.',
      focusTopicIds: ['quiz-1'],
      practiceSuggestions: [
        { title: 'Practice equations', reason: 'Low accuracy.', topicId: 'quiz-1' },
      ],
    });
  });

  it('filters exam preparation sequence items to supplied topics', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockResolvedValue(
      contentResponse(
        JSON.stringify({
          summary: 'Start with Cell Biology.',
          sequence: [
            {
              topicId: 'topic-1',
              reason: 'Low accuracy.',
              practiceActivity: 'Answer practice questions.',
            },
            {
              topicId: 'topic-1',
              reason: 'Duplicate.',
              practiceActivity: 'Duplicate.',
            },
            {
              topicId: 'unknown-topic',
              reason: 'Not in the plan.',
              practiceActivity: 'Ignore.',
            },
            {
              topicId: 'topic-2',
              reason: 'No evidence yet.',
              practiceActivity: 'Build a concept map.',
            },
          ],
          cautions: ['Limited quiz evidence.', 'Limited quiz evidence.'],
          usedChunkIds: ['chunk-1', 'unknown-chunk'],
        }),
      ),
    );

    const input = {
      topics: [{ topicId: 'topic-1' }, { topicId: 'topic-2' }],
      sourceChunks: [{ chunkId: 'chunk-1' }],
    } as unknown as AIExamPreparationInput;

    await expect(provider.planExamPreparation(input)).resolves.toEqual({
      summary: 'Start with Cell Biology.',
      sequence: [
        {
          topicId: 'topic-1',
          reason: 'Low accuracy.',
          practiceActivity: 'Answer practice questions.',
        },
        {
          topicId: 'topic-2',
          reason: 'No evidence yet.',
          practiceActivity: 'Build a concept map.',
        },
      ],
      cautions: ['Limited quiz evidence.'],
      usedChunkIds: ['chunk-1'],
    });
  });

  it('maps quota failures to a retryable 429', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockResolvedValue(jsonResponse({}, 429));

    await expect(
      provider.summarizeNote({ title: 'Graphs', content: 'BFS uses a queue.' }),
    ).rejects.toMatchObject({ name: 'AppError', statusCode: 429, isOperational: true });
  });

  it('maps credential failures without exposing provider response bodies', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockResolvedValue(jsonResponse({ error: 'secret detail' }, 401));

    await expect(
      provider.summarizeNote({ title: 'Graphs', content: 'BFS uses a queue.' }),
    ).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 503,
      isOperational: false,
      message: expect.stringContaining('AI_API_KEY'),
    });
  });

  it('maps unreachable providers and server failures safely', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(
      provider.summarizeNote({ title: 'Graphs', content: 'BFS uses a queue.' }),
    ).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 502,
      isOperational: true,
      message: expect.not.stringContaining('network down'),
    });

    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    await expect(
      provider.summarizeNote({ title: 'Graphs', content: 'BFS uses a queue.' }),
    ).rejects.toMatchObject({ statusCode: 502 });
  });

  it('aborts requests that exceed the configured timeout', async () => {
    const fetchMock = jest.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise<OpenAICompatibleHttpResponse>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
          });
        }),
    );
    const provider = new OpenAICompatibleAIProvider(
      { ...options, timeoutMs: 10 },
      fetchMock as unknown as OpenAICompatibleFetch,
    );

    await expect(
      provider.summarizeNote({ title: 'Graphs', content: 'BFS uses a queue.' }),
    ).rejects.toMatchObject({ name: 'AppError', statusCode: 504, isOperational: true });
  });

  it('rejects empty or malformed provider responses', async () => {
    const { provider, fetchMock } = makeProvider();
    fetchMock.mockResolvedValue(jsonResponse({ choices: [] }));

    await expect(
      provider.summarizeNote({ title: 'Graphs', content: 'BFS uses a queue.' }),
    ).rejects.toMatchObject({ name: 'AppError', statusCode: 502 });

    fetchMock.mockResolvedValue(contentResponse('not json'));
    await expect(
      provider.generateQuiz({ title: 'Graphs', content: 'BFS uses a queue.' }),
    ).rejects.toMatchObject({ name: 'AppError', statusCode: 502 });
  });

  it('rejects oversized prompts before calling the provider', async () => {
    const { fetchMock } = makeProvider();
    const provider = new OpenAICompatibleAIProvider(
      { ...options, maxInputChars: 10 },
      fetchMock as unknown as OpenAICompatibleFetch,
    );

    await expect(
      provider.summarizeNote({ title: 'Long', content: 'x'.repeat(100) }),
    ).rejects.toMatchObject({ name: 'PayloadTooLargeError', statusCode: 413 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
