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

const performanceInput = {
  generatedAt: '2026-05-15T12:00:00.000Z',
  range: { from: '2026-04-16T00:00:00.000Z', to: '2026-05-15T23:59:59.999Z', days: 30 },
  dataQuality: {
    attemptCount: 2,
    answeredQuestions: 10,
    reliable: true,
    insufficientData: [],
    limitations: ['Quiz questions do not store curriculum topic tags.'],
  },
  overall: {
    attemptCount: 2,
    answeredQuestions: 10,
    correctAnswers: 4,
    incorrectAnswers: 6,
    accuracy: 40,
    averageAttemptScore: 40,
    trend: {
      direction: 'declining',
      recentAccuracy: 30,
      previousAccuracy: 50,
      recentQuestions: 5,
      previousQuestions: 5,
    },
  },
  subjects: [
    {
      subject: 'Mathematics',
      attemptCount: 2,
      answeredQuestions: 10,
      correctAnswers: 4,
      incorrectAnswers: 6,
      accuracy: 40,
      studyMinutes: 90,
    },
  ],
  weakTopics: [
    {
      topicId: 'quiz-1',
      topicName: 'Algebra',
      accuracy: 40,
      answeredQuestions: 10,
      incorrectAnswers: 6,
      repeatedMistakes: 2,
      trend: {
        direction: 'declining',
        recentAccuracy: 30,
        previousAccuracy: 50,
        recentQuestions: 5,
        previousQuestions: 5,
      },
      evidence: ['4/10 questions correct (40% accuracy).'],
      revisionMemoryStrength: null,
    },
  ],
  strongTopics: [],
  recentAttempts: [],
  studyConsistency: {
    totalStudyMinutes: 90,
    sessionCount: 2,
    activeDays: 2,
    daysInRange: 30,
    currentStreakDays: 1,
    availableMinutesPerWeek: 600,
    plannedMinutes: 0,
    completedMinutes: 0,
    planCompletionPercentage: null,
    upcomingExams: [],
  },
  revision: {
    trackedTopics: 0,
    dueNow: 0,
    needsRevision: 0,
    mastered: 0,
    reviewedInRange: 0,
    averageMemoryStrength: null,
    masteredPercentage: null,
  },
  recommendations: [
    {
      id: 'weak:quiz-1',
      title: 'Revise Algebra',
      reason: '4/10 questions correct (40% accuracy).',
      suggestedMinutes: 25,
      topicId: 'quiz-1',
      alreadyScheduled: false,
    },
  ],
};

describe('GeminiAIProvider performance interpretation', () => {
  it('parses and sanitizes performance interpretation JSON', async () => {
    const { provider, generateContent } = makeProvider();
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        summary: 'Accuracy is low and declining.',
        strengths: ['Persistence', 'Persistence'],
        improvementAreas: ['Algebra'],
        trendInterpretation: 'Recent accuracy fell from 50% to 30%.',
        focusTopicIds: ['quiz-1', 'quiz-1', 'not-owned'],
        practiceSuggestions: [
          { title: 'Practice equations', reason: 'Low accuracy.', topicId: 'quiz-1' },
          { title: 'Invalid', reason: 'Bad topic id.', topicId: 'not-owned' },
          { title: '', reason: 'Missing title.', topicId: null },
          { title: 'Review worked examples', reason: 'Build confidence.', topicId: null },
        ],
      }),
    });

    const result = await provider.interpretPerformance(performanceInput);

    expect(result.summary).toBe('Accuracy is low and declining.');
    expect(result.strengths).toEqual(['Persistence']);
    expect(result.focusTopicIds).toEqual(['quiz-1', 'not-owned']);
    expect(result.practiceSuggestions).toEqual([
      { title: 'Practice equations', reason: 'Low accuracy.', topicId: 'quiz-1' },
      { title: 'Invalid', reason: 'Bad topic id.', topicId: 'not-owned' },
      { title: 'Review worked examples', reason: 'Build confidence.', topicId: null },
    ]);
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining('quiz-1'),
      }),
    );
  });

  it('rejects invalid performance interpretation payloads', async () => {
    const { provider, generateContent } = makeProvider();
    generateContent.mockResolvedValue({
      text: JSON.stringify({ summary: '', trendInterpretation: 'No summary.' }),
    });

    await expect(provider.interpretPerformance(performanceInput)).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 502,
    });
  });
});

const examPreparationInput = {
  examName: 'Biology Final',
  examDate: '2026-04-10T09:00:00.000Z',
  daysRemaining: 20,
  subject: 'Biology',
  spaceName: 'Biology',
  dailyStudyHours: 2,
  availability: { weeklyMinutes: 840, source: 'saved' as const },
  dataQuality: {
    reliable: true,
    insufficientData: [],
    limitations: ['Quiz questions do not store curriculum topic tags.'],
  },
  topics: [
    {
      topicId: 'topic-1',
      topicName: 'Cell Biology',
      estimatedMinutes: 60,
      completed: false,
      performance: {
        accuracy: 40,
        answeredQuestions: 5,
        classification: 'weak',
        evidence: ['2/5 questions correct.'],
        trendDirection: 'declining',
      },
      revision: null,
    },
    {
      topicId: 'topic-2',
      topicName: 'Genetics',
      estimatedMinutes: 45,
      completed: false,
      performance: null,
      revision: null,
    },
  ],
  sourceChunks: [
    {
      chunkId: 'chunk-1',
      documentTitle: 'syllabus.txt',
      pageNumber: 1,
      section: 'Cell Biology',
      text: 'Cell Biology covers membranes and organelles.',
    },
  ],
};

describe('GeminiAIProvider exam preparation', () => {
  it('parses and sanitizes exam preparation JSON', async () => {
    const { provider, generateContent } = makeProvider();
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        summary: 'Start with the weak Cell Biology evidence.',
        sequence: [
          {
            topicId: 'topic-1',
            reason: 'Accuracy is low.',
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
            practiceActivity: 'Ignore this.',
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
    });

    const result = await provider.planExamPreparation(examPreparationInput);

    expect(result.summary).toBe('Start with the weak Cell Biology evidence.');
    expect(result.sequence).toEqual([
      {
        topicId: 'topic-1',
        reason: 'Accuracy is low.',
        practiceActivity: 'Answer practice questions.',
      },
      {
        topicId: 'topic-2',
        reason: 'No evidence yet.',
        practiceActivity: 'Build a concept map.',
      },
    ]);
    expect(result.cautions).toEqual(['Limited quiz evidence.']);
    expect(result.usedChunkIds).toEqual(['chunk-1']);
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining('topic-1'),
      }),
    );
  });

  it('rejects invalid exam preparation payloads', async () => {
    const { provider, generateContent } = makeProvider();
    generateContent.mockResolvedValue({
      text: JSON.stringify({ summary: '', sequence: [] }),
    });

    await expect(
      provider.planExamPreparation(examPreparationInput),
    ).rejects.toMatchObject({ name: 'AppError', statusCode: 502 });
  });
});
