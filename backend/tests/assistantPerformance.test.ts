import { IAIProvider } from '../src/domain/interfaces/IAIProvider';
import { AssistantContextBuilder } from '../src/services/AssistantContextBuilder';
import { AssistantService } from '../src/services/AssistantService';
import { AiAccessService } from '../src/services/AiAccessService';
import { AiRateLimiter } from '../src/services/AiRateLimiter';
import { AttentionService } from '../src/services/AttentionService';
import {
  PerformanceAnalysisService,
  PerformanceReport,
} from '../src/services/PerformanceAnalysisService';
import { ExamPlanRepository } from '../src/repositories/ExamPlanRepository';
import { StudySpaceRepository } from '../src/repositories/StudySpaceRepository';
import { Config } from '../src/config/Config';

const report = {
  analysis: {
    generatedAt: new Date('2026-05-15T12:00:00.000Z'),
    weakTopics: [
      {
        topicId: 'weak-1',
        topicName: 'Algebra',
        accuracy: 40,
        answeredQuestions: 5,
        evidence: ['2/5 questions correct (40% accuracy).'],
      },
    ],
    dataQuality: {
      reliable: true,
      attemptCount: 1,
      answeredQuestions: 5,
      insufficientData: [],
      limitations: ['Quiz questions do not store curriculum topic tags.'],
    },
  },
  recommendations: [{ id: 'weak:weak-1', topicName: 'Algebra' }],
} as unknown as PerformanceReport;

describe('AssistantService performance grounding', () => {
  it('drops AI focus topics and suggestions that are not measured weak topics', async () => {
    const aiProvider = {
      name: 'mock',
      interpretPerformance: jest.fn().mockResolvedValue({
        summary: 'Low accuracy in Algebra.',
        strengths: [],
        improvementAreas: ['Algebra'],
        trendInterpretation: 'No trend yet.',
        focusTopicIds: ['weak-1', 'strong-1', 'unknown'],
        practiceSuggestions: [
          {
            title: 'Practice Algebra',
            reason: '2/5 questions correct.',
            topicId: 'weak-1',
          },
          {
            title: 'Explore a strong topic',
            reason: 'Invalid focus.',
            topicId: 'strong-1',
          },
          {
            title: 'General revision habit',
            reason: 'Useful for any subject.',
            topicId: null,
          },
        ],
      }),
    } as unknown as IAIProvider;

    const performanceService = {
      analyze: jest.fn().mockResolvedValue(report),
      buildAIInput: jest.fn().mockReturnValue({}),
    } as unknown as PerformanceAnalysisService;
    const aiAccessService = {
      assertAccess: jest.fn().mockResolvedValue(undefined),
    } as unknown as AiAccessService;
    const rateLimiter = {
      consume: jest.fn(),
    } as unknown as AiRateLimiter;

    const service = new AssistantService(
      aiProvider,
      {} as ExamPlanRepository,
      {} as StudySpaceRepository,
      {} as AttentionService,
      aiAccessService,
      {} as AssistantContextBuilder,
      rateLimiter,
      performanceService,
      {} as Config,
    );

    const result = await service.analyzePerformance('user-1', { days: 30 });

    expect(rateLimiter.consume).toHaveBeenCalledWith('user-1');
    expect(result.focusTopics).toEqual([
      {
        topicId: 'weak-1',
        topicName: 'Algebra',
        accuracy: 40,
        answeredQuestions: 5,
        evidence: ['2/5 questions correct (40% accuracy).'],
      },
    ]);
    expect(result.practiceSuggestions).toEqual([
      {
        title: 'Practice Algebra',
        reason: '2/5 questions correct.',
        topicId: 'weak-1',
        topicName: 'Algebra',
      },
      {
        title: 'General revision habit',
        reason: 'Useful for any subject.',
        topicId: null,
        topicName: null,
      },
    ]);
    expect(result.recommendations).toBe(report.recommendations);
  });
});
