import { ApiError } from '@google/genai';
import {
  GeminiAIProvider,
  GeminiClient,
  GeminiProviderOptions,
} from '../src/patterns/adapter/GeminiAIProvider';

const options: GeminiProviderOptions = {
  apiKey: 'test-key',
  model: 'gemini-3.8-flash',
  maxInputChars: 20_000,
  maxOutputTokens: 1_024,
  timeoutMs: 5_000,
};

const makeProvider = () => {
  const generateContent = jest.fn();
  const client = { models: { generateContent } } as unknown as GeminiClient;
  return { provider: new GeminiAIProvider(options, client), generateContent };
};

describe('GeminiAIProvider', () => {
  it('summarizes a note with the configured model and output limit', async () => {
    const { provider, generateContent } = makeProvider();
    generateContent.mockResolvedValue({ text: '  A short summary.  ' });

    const summary = await provider.summarizeNote({
      title: 'Graphs',
      content: 'Breadth-first search explores a graph level by level.',
    });

    expect(summary).toBe('A short summary.');
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.8-flash',
        config: expect.objectContaining({
          maxOutputTokens: 1_024,
          systemInstruction: expect.stringContaining('StudyFlows'),
        }),
      }),
    );
  });

  it('parses fenced JSON quiz responses', async () => {
    const { provider, generateContent } = makeProvider();
    generateContent.mockResolvedValue({
      text: '```json\n{"questions":[{"type":"true_false","prompt":"BFS uses a queue.","correctAnswer":true}]}\n```',
    });

    const questions = await provider.generateQuiz({
      title: 'Graphs',
      content: 'BFS uses a queue.',
      questionCount: 1,
    });

    expect(questions).toEqual([
      {
        type: 'true_false',
        prompt: 'BFS uses a queue.',
        correctAnswer: true,
      },
    ]);
  });

  it('builds chat history with Gemini roles and normalizes citations', async () => {
    const { provider, generateContent } = makeProvider();
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        answer: 'BFS explores level by level.',
        citedNoteIds: ['note-1', 'note-1'],
        usedExternalKnowledge: false,
      }),
    });

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
      history: [
        { role: 'user', content: 'Earlier question' },
        { role: 'assistant', content: 'Earlier answer' },
      ],
    });

    expect(result.citedNoteIds).toEqual(['note-1']);
    expect(result.answer).toBe('BFS explores level by level.');
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          expect.objectContaining({ role: 'user' }),
          expect.objectContaining({ role: 'model' }),
          expect.objectContaining({ role: 'user' }),
        ],
      }),
    );
  });

  it('rejects malformed JSON responses', async () => {
    const { provider, generateContent } = makeProvider();
    generateContent.mockResolvedValue({ text: 'not json' });

    await expect(
      provider.generateQuiz({ title: 'Graphs', content: 'BFS uses a queue.' }),
    ).rejects.toMatchObject({ name: 'AppError', statusCode: 502 });
  });

  it('rejects oversized prompts before calling Gemini', async () => {
    const { generateContent } = makeProvider();
    const small = new GeminiAIProvider({ ...options, maxInputChars: 10 }, {
      models: { generateContent },
    } as unknown as GeminiClient);

    await expect(small.summarizeNote({ title: 'Long', content: 'x'.repeat(100) }))
      .rejects.toMatchObject({ name: 'PayloadTooLargeError', statusCode: 413 });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('maps Gemini quota errors to a retryable 429', async () => {
    const { provider, generateContent } = makeProvider();
    generateContent.mockRejectedValue(
      new ApiError({ message: 'quota exceeded', status: 429 }),
    );

    await expect(
      provider.summarizeNote({ title: 'Graphs', content: 'BFS uses a queue.' }),
    ).rejects.toMatchObject({ statusCode: 429 });
  });
});
